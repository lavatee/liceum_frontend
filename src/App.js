import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import Timeline from "./components/Timeline";
import Modal from "./components/Modal";
import { eventsApi, authApi, apiClient } from "./api/client";

function App() {
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [authStep, setAuthStep] = useState("idle");

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
            <button className="login-btn" onClick={() => { localStorage.removeItem("access"); localStorage.removeItem("refresh"); setAuthStep("idle"); }}>Выйти</button>
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
          <Timeline events={allEvents} onSelectBlock={openBlock} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {selectedBlock && (
          <div>
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
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;
