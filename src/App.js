import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import Timeline from "./components/Timeline";
import Modal from "./components/Modal";
import { eventsApi, authApi, apiClient, adminApi } from "./api/client";

function App() {
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [editBlockDraft, setEditBlockDraft] = useState(null);
  const [savingEditBlock, setSavingEditBlock] = useState(false);
  const [createBlockForEvent, setCreateBlockForEvent] = useState(null);
  const [newBlock, setNewBlock] = useState({ name: "", description: "", link: "", startDate: "", endDate: "" });
  const [savingBlock, setSavingBlock] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [authStep, setAuthStep] = useState("idle");
  const [isAdmin, setIsAdmin] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: "", description: "" });
  const [editEvent, setEditEvent] = useState(null);
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await eventsApi.getCurrentEvents();
        const data = await res.json();
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const res = await eventsApi.getAllEvents();
        const data = await res.json();
        setAllEvents(Array.isArray(data.events) ? data.events : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // auth persistence on reload: if tokens present, try to refresh or trust access
  useEffect(() => {
    const access = apiClient.getAccessToken();
    const refresh = apiClient.getRefreshToken();
    if (!access && !refresh) {
      setIsAdmin(false);
      setAuthStep("idle");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // optimistic: mark as logged, then verify via a protected ping (create a no-op like listing admins endpoints by trying to GET all-events with Authorization won't help because public). We can attempt a lightweight refresh.
        setAuthStep("done");
        setIsAdmin(true);
        if (refresh) {
          const res = await authApi.refresh(refresh);
          if (res.ok) {
            const data = await res.json();
            apiClient.setTokens(data.access, data.refresh);
          } else if (!access) {
            // tokens invalid
            if (!cancelled) {
              localStorage.removeItem("access");
              localStorage.removeItem("refresh");
              setIsAdmin(false);
              setAuthStep("idle");
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openBlock(block) {
    setSelectedBlock(block);
    setModalOpen(true);
  }

  async function handleLogin() {
    if (!email) return;
    setAuthStep("sending");
    const res = await authApi.sendCode(email);
    if (res.ok) setAuthStep("code");
    else setAuthStep("idle");
  }

  async function handleVerify() {
    if (!code) return;
    const res = await authApi.verifyCode(email, code);
    if (res.ok) {
      const data = await res.json();
      apiClient.setTokens(data.access, data.refresh);
      setAuthStep("done");
      setIsAdmin(true);
    }
  }

  async function handleCreateEvent() {
    setAdminError("");
    const payload = { name: newEvent.name.trim(), description: newEvent.description.trim(), event_blocks: [] };
    if (!payload.name) return;
    const res = await adminApi.createEvent(payload);
    if (res.ok) {
      const data = await res.json();
      // reload events
      const [cur, all] = await Promise.all([eventsApi.getCurrentEvents(), eventsApi.getAllEvents()]);
      const curData = await cur.json();
      const allData = await all.json();
      setEvents(Array.isArray(curData.events) ? curData.events : []);
      setAllEvents(Array.isArray(allData.events) ? allData.events : []);
      setNewEvent({ name: "", description: "" });
    } else {
      setAdminError("Не удалось создать событие");
    }
  }

  async function handleDeleteEvent(id) {
    setAdminError("");
    const res = await adminApi.deleteEvent(id);
    if (res.ok) {
      const [cur, all] = await Promise.all([eventsApi.getCurrentEvents(), eventsApi.getAllEvents()]);
      const curData = await cur.json();
      const allData = await all.json();
      setEvents(Array.isArray(curData.events) ? curData.events : []);
      setAllEvents(Array.isArray(allData.events) ? allData.events : []);
    } else {
      setAdminError("Не удалось удалить событие");
    }
  }

  async function handleSaveEvent() {
    if (!editEvent) return;
    setAdminError("");
    const res = await adminApi.updateEvent(editEvent.id, { name: editEvent.name, description: editEvent.description });
    if (res.ok) {
      const [cur, all] = await Promise.all([eventsApi.getCurrentEvents(), eventsApi.getAllEvents()]);
      const curData = await cur.json();
      const allData = await all.json();
      setEvents(Array.isArray(curData.events) ? curData.events : []);
      setAllEvents(Array.isArray(allData.events) ? allData.events : []);
      setEditEvent(null);
    } else {
      setAdminError("Не удалось сохранить изменения");
    }
  }

  const highlights = useMemo(() => {
    // простая подборка первых 5 событий для карточки
    return events.slice(0, 5).map((e) => e.name);
  }, [events]);

  return (
    <div className="container">
      <div className="header">
        <div className="logo">
          <img src="/img/logo.png" alt="logo" />
          <div className="title">Проектный тасклайн</div>
        </div>
        <div>
          {authStep !== "done" ? (
            <div style={{ display: "flex", gap: 8 }}>
              {authStep === "code" ? (
                <>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Код из письма"
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
                  />
                  <button className="login-btn" onClick={handleVerify}>Войти</button>
                </>
              ) : (
                <>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ваш email (админ)"
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
                  />
                  <button className="login-btn" onClick={handleLogin} disabled={authStep === "sending"}>
                    Войти как админ
                  </button>
                </>
              )}
            </div>
          ) : (
            <button className="login-btn" onClick={() => { localStorage.removeItem("access"); localStorage.removeItem("refresh"); setAuthStep("idle"); setIsAdmin(false); }}>Выйти</button>
          )}
        </div>
      </div>

      <div className="highlight-card">
        <div className="row">
          <div className="highlight-title">Активные события на сегодня</div>
          <div className="highlight-list">
            {highlights.map((h, i) => (
              <div key={i}>{h}</div>
            ))}
          </div>
        </div>
      </div>

      <div>
        {loading ? (
          <div style={{ padding: 20 }}>Загрузка…</div>
        ) : (
          <Timeline
            events={allEvents}
            onSelectBlock={openBlock}
            adminMode={isAdmin}
            onEditEvent={(ev) => setEditEvent({ id: ev.id, name: ev.name, description: ev.description })}
            onDeleteEvent={(ev) => handleDeleteEvent(ev.id)}
            onAddBlock={(ev) => { setCreateBlockForEvent(ev); setNewBlock({ name: "", description: "", link: "", startDate: "", endDate: "" }); }}
          />
        )}
      </div>

      {isAdmin && (
        <div className="admin-panel" style={{ marginTop: 16, padding: 16, border: "1px solid #3e4486", borderRadius: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Панель администратора</div>
          {adminError && <div style={{ color: "#f77" }}>{adminError}</div>}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={newEvent.name}
              onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
              placeholder="Название события"
              style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff", flex: 1 }}
            />
            <input
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="Описание"
              style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff", flex: 2 }}
            />
            <button className="btn btn--primary" onClick={handleCreateEvent}>Создать событие</button>
          </div>

          {editEvent && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                value={editEvent.name}
                onChange={(e) => setEditEvent({ ...editEvent, name: e.target.value })}
                placeholder="Название"
                style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff", flex: 1 }}
              />
              <input
                value={editEvent.description}
                onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                placeholder="Описание"
                style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff", flex: 2 }}
              />
              <button className="login-btn" onClick={handleSaveEvent}>Сохранить</button>
              <button className="login-btn" onClick={() => setEditEvent(null)} style={{ background: "#444a8b" }}>Отмена</button>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditBlockDraft(null); setSavingEditBlock(false); }}>
        {selectedBlock && (
          <div>
            {!isAdmin || !editBlockDraft ? (
              <>
                <h3 style={{ marginTop: 0 }}>{selectedBlock.name}</h3>
                <div style={{ color: "#aeb4e4", marginBottom: 8 }}>
                  {new Date(selectedBlock.start_date || selectedBlock.startDate).toLocaleDateString("ru-RU")} — {new Date(selectedBlock.end_date || selectedBlock.endDate).toLocaleDateString("ru-RU")}
                </div>
                <p style={{ marginTop: 0 }}>{selectedBlock.description}</p>
                {selectedBlock.link && (
                  <a href={selectedBlock.link} target="_blank" rel="noreferrer" style={{ color: "#8ea1ff" }}>
                    Перейти по ссылке
                  </a>
                )}
                {isAdmin && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="btn btn--primary" onClick={() => setEditBlockDraft({ name: selectedBlock.name, description: selectedBlock.description, link: selectedBlock.link || "" })}>Изменить</button>
                    <button
                      className="btn btn--danger"
                      onClick={async () => {
                        const res = await adminApi.deleteBlock(selectedBlock.id);
                        if (res.ok) {
                          const [cur, all] = await Promise.all([eventsApi.getCurrentEvents(), eventsApi.getAllEvents()]);
                          const curData = await cur.json();
                          const allData = await all.json();
                          setEvents(Array.isArray(curData.events) ? curData.events : []);
                          setAllEvents(Array.isArray(allData.events) ? allData.events : []);
                          setModalOpen(false);
                        }
                      }}
                    >
                      Удалить блок
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Редактирование блока</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    value={editBlockDraft.name}
                    onChange={(e) => setEditBlockDraft({ ...editBlockDraft, name: e.target.value })}
                    placeholder="Название блока"
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
                  />
                  <input
                    value={editBlockDraft.description}
                    onChange={(e) => setEditBlockDraft({ ...editBlockDraft, description: e.target.value })}
                    placeholder="Описание"
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
                  />
                  <input
                    value={editBlockDraft.link}
                    onChange={(e) => setEditBlockDraft({ ...editBlockDraft, link: e.target.value })}
                    placeholder="Ссылка (необязательно)"
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button
                      className="btn btn--primary"
                      disabled={savingEditBlock || !editBlockDraft.name}
                      onClick={async () => {
                        setSavingEditBlock(true);
                        const res = await adminApi.updateBlock(selectedBlock.id, {
                          name: editBlockDraft.name.trim(),
                          description: editBlockDraft.description.trim(),
                          link: editBlockDraft.link.trim(),
                        });
                        setSavingEditBlock(false);
                        if (res.ok) {
                          const [cur, all] = await Promise.all([eventsApi.getCurrentEvents(), eventsApi.getAllEvents()]);
                          const curData = await cur.json();
                          const allData = await all.json();
                          setEvents(Array.isArray(curData.events) ? curData.events : []);
                          setAllEvents(Array.isArray(allData.events) ? allData.events : []);
                          setSelectedBlock({ ...selectedBlock, name: editBlockDraft.name, description: editBlockDraft.description, link: editBlockDraft.link });
                          setEditBlockDraft(null);
                        }
                      }}
                    >
                      Сохранить
                    </button>
                    <button className="btn" onClick={() => setEditBlockDraft(null)}>Отмена</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Create Block Modal */}
      <Modal open={!!createBlockForEvent} onClose={() => setCreateBlockForEvent(null)}>
        {createBlockForEvent && (
          <div>
            <h3 style={{ marginTop: 0 }}>Новый блок: {createBlockForEvent.name}</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={newBlock.name}
                onChange={(e) => setNewBlock({ ...newBlock, name: e.target.value })}
                placeholder="Название блока"
                style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
              />
              <input
                value={newBlock.description}
                onChange={(e) => setNewBlock({ ...newBlock, description: e.target.value })}
                placeholder="Описание"
                style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
              />
              <input
                value={newBlock.link}
                onChange={(e) => setNewBlock({ ...newBlock, link: e.target.value })}
                placeholder="Ссылка (необязательно)"
                style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  type="date"
                  value={newBlock.startDate}
                  onChange={(e) => setNewBlock({ ...newBlock, startDate: e.target.value })}
                  style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
                />
                <input
                  type="date"
                  value={newBlock.endDate}
                  onChange={(e) => setNewBlock({ ...newBlock, endDate: e.target.value })}
                  style={{ padding: 8, borderRadius: 8, border: "1px solid #3e4486", background: "#111433", color: "#fff" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  className="btn btn--primary"
                  disabled={savingBlock || !newBlock.name || !newBlock.startDate || !newBlock.endDate}
                  onClick={async () => {
                    setSavingBlock(true);
                    const start = new Date(newBlock.startDate + "T00:00:00");
                    const end = new Date(newBlock.endDate + "T00:00:00");
                    const blocks = [
                      {
                        event_id: createBlockForEvent.id,
                        name: newBlock.name.trim(),
                        description: newBlock.description.trim(),
                        link: newBlock.link.trim(),
                        start_date: start.toISOString(),
                        end_date: end.toISOString(),
                      },
                    ];
                    const res = await adminApi.createBlocks(blocks);
                    setSavingBlock(false);
                    if (res.ok) {
                      const [cur, all] = await Promise.all([eventsApi.getCurrentEvents(), eventsApi.getAllEvents()]);
                      const curData = await cur.json();
                      const allData = await all.json();
                      setEvents(Array.isArray(curData.events) ? curData.events : []);
                      setAllEvents(Array.isArray(allData.events) ? allData.events : []);
                      setCreateBlockForEvent(null);
                    }
                  }}
                >
                  Создать блок
                </button>
                <button className="btn" onClick={() => setCreateBlockForEvent(null)}>Отмена</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;
