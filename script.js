"use strict";
/* PZB-010 — Ótica São João | Demonstração V5
   Sem integração externa ou envio de WhatsApp.
   Solicitações são gravadas somente no navegador local. */
const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");
const messages = document.getElementById("chatMessages");
const sendButton = form?.querySelector("button[type='submit']");
const resetChatButton = document.getElementById("resetChatButton");
const STORAGE_KEY = "pzb_otica_sao_joao_requests";
const WELCOME = "Olá! Seja bem-vindo à Ótica São João. Como posso ajudar você hoje?";
const descriptions = {
  grau: "óculos de grau", sol: "óculos de sol", lentes: "lentes de contato",
  consulta: "informações sobre consultas", conserto: "ajuste ou conserto de óculos"
};
const state = { topic: null, unit: null, interest: null, stage: "initial", busy: false, handoffs: [] };
function normalize(value) {
  return String(value).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}
function matches(text, terms) {
  return terms.some(term => (` ${text} `).includes(` ${normalize(term)} `));
}
function identifyUnit(text) {
  if (matches(text, ["navegantes", "navega"])) return "Navegantes";
  if (matches(text, ["itajai", "itajahy"])) return "Itajaí";
  return null;
}
function identifyTopic(text) {
  if (matches(text, ["consulta", "consultas", "consultorio", "exame", "exames", "oftalmologista", "agendar", "agendamento"])) return "consulta";
  if (matches(text, ["lente de contato", "lentes de contato"])) return "lentes";
  if (matches(text, ["oculos de sol", "oculos escuros", "solar"])) return "sol";
  if (matches(text, ["conserto", "reparo", "quebrou", "arrumar", "ajustar", "ajuste"])) return "conserto";
  if (matches(text, ["oculos de grau", "armacao", "armacoes", "grau", "oculos", "lentes"])) return "grau";
  return null;
}
function identifyStyle(text) {
  if (matches(text, ["classico", "classicos", "classica", "classicas"])) return "clássico";
  if (matches(text, ["esportivo", "esportivos", "esportiva", "esportivas"])) return "esportivo";
  if (matches(text, ["moderno", "modernos", "moderna", "modernas"])) return "moderno";
  return null;
}
function addMessage(text, sender = "assistant") {
  const element = document.createElement("div");
  element.className = `message ${sender}`;
  element.textContent = text;
  messages.appendChild(element);
  messages.scrollTop = messages.scrollHeight;
}
function setBusy(value) {
  state.busy = value;
  input.disabled = value;
  sendButton.disabled = value;
  if (resetChatButton) resetChatButton.disabled = value;
  if (!value) input.focus();
}
function reply(text) {
  setBusy(true);
  const typing = document.createElement("div");
  typing.className = "typing-indicator";
  typing.setAttribute("role", "status");
  typing.innerHTML = '<span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span><small>Digitando...</small>';
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;
  const delay = Math.min(3000, Math.max(1100, text.length * 18));
  window.setTimeout(() => {
    typing.remove();
    addMessage(text);
    setBusy(false);
  }, delay);
}
function clearContext() {
  state.topic = null;
  state.unit = null;
  state.interest = null;
  state.stage = "initial";
}
function askForUnit() {
  state.stage = "awaitingUnit";
  reply("Você prefere atendimento em Itajaí ou Navegantes?");
}
function askForConfirmation() {
  if (!state.unit) return askForUnit();
  state.stage = "awaitingConfirmation";
  const subject = descriptions[state.topic] || "sua solicitação";
  const detail = state.interest ? ` Interesse informado: ${state.interest}.` : "";
  reply(`Perfeito! Sobre ${subject}, na unidade de ${state.unit}, nossa equipe poderá orientar você com mais detalhes.${detail} Gostaria que eu preparasse o encaminhamento para um atendente?`);
}
function readRequests() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) throw new Error("Formato de registros inválido.");
  return parsed;
}
function confirmHandoff() {
  let requests;
  try { requests = readRequests(); }
  catch (error) {
    console.error("Erro ao ler solicitações:", error);
    reply("Não foi possível acessar os registros desta demonstração. Verifique o armazenamento do navegador antes de tentar novamente.");
    return;
  }
  const nextNumber = requests.reduce((max, item) => {
    const found = /^DEMO-(\d+)$/.exec(String(item?.id || ""));
    return found ? Math.max(max, Number(found[1])) : max;
  }, 0) + 1;
  const request = {
    id: `DEMO-${String(nextNumber).padStart(3, "0")}`,
    topic: descriptions[state.topic] || "Atendimento geral",
    unit: state.unit,
    status: "Aguardando atendimento",
    createdAt: new Date().toISOString(),
    origin: "Assistente demonstrativo",
    type: "Solicitação simulada"
  };
  if (state.interest) request.interest = state.interest;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...requests, request])); }
  catch (error) {
    console.error("Erro ao salvar solicitação:", error);
    reply("Não foi possível registrar a solicitação nesta demonstração. Tente novamente.");
    return;
  }
  state.handoffs.push(request);
  state.stage = "completed";
  reply("Combinado! Sua solicitação foi registrada neste ambiente demonstrativo.\n\n" +
    `Unidade: ${request.unit}\nAssunto: ${request.topic}\n` +
    (request.interest ? `Interesse: ${request.interest}\n` : "") +
    `Protocolo: ${request.id}\n\nNenhuma mensagem foi enviada à empresa ou ao WhatsApp. Você pode continuar conversando por aqui.`);
}
function processMessage(original) {
  const text = normalize(original);
  if (matches(text, ["reiniciar", "nova conversa", "comecar de novo"])) {
    clearContext(); reply("Claro! Vamos começar uma nova solicitação. Como posso ajudar você?"); return;
  }
  const unit = identifyUnit(text);
  const topic = identifyTopic(text);
  const style = identifyStyle(text);
  const wantsHuman = matches(text, ["atendente", "humano", "pessoa", "equipe", "vendedor", "falar com alguem", "falar com vendedor", "falar com a equipe"]);
  const asksPrice = matches(text, ["preco", "precos", "valor", "valores", "quanto custa", "orcamento"]);
  const asksCatalog = matches(text, ["foto", "fotos", "imagem", "imagens", "catalogo", "modelos", "modelo", "marcas", "vitrine", "mostrar opcoes", "ver opcoes"]);
  const confirms = matches(text, ["sim", "claro", "pode", "quero", "por favor", "com certeza"]);
  const declines = matches(text, ["nao", "agora nao", "prefiro nao"]);
  if (state.stage === "completed") {
    clearContext();
    if (!topic && !unit && !wantsHuman && !asksPrice && !asksCatalog) {
      reply("Estou por aqui! Você gostaria de informações sobre outro produto ou serviço?"); return;
    }
  }
  if (state.stage === "awaitingConfirmation") {
    if (declines && !topic && !unit && !asksCatalog) {
      state.stage = "initial";
      reply("Sem problema! Podemos continuar conversando. O que mais gostaria de saber?"); return;
    }
    if (unit && unit !== state.unit) { state.unit = unit; askForConfirmation(); return; }
    if (topic && topic !== state.topic) { state.topic = topic; state.interest = null; state.stage = "initial"; }
    else if (confirms && !topic && !unit && !asksCatalog && !asksPrice) { confirmHandoff(); return; }
  }
  if (unit) state.unit = unit;
  if (topic) {
    if (state.topic !== topic) state.interest = null;
    state.topic = topic;
  }
  if (style) state.interest = `Estilo ${style}`;
  if (asksCatalog) {
    if (state.stage === "awaitingStyle" && !topic && !style) state.interest = "Solicitou catálogo/fotos";
    if (!state.interest) state.interest = "Solicitou catálogo/fotos";
    if (!state.topic) {
      state.stage = "awaitingCatalogTopic";
      reply("Posso ajudar a solicitar fotos e opções à equipe. Você procura óculos de grau, óculos de sol ou lentes de contato? Esta demonstração não consulta um catálogo real.");
      return;
    }
    if (!style && state.topic !== "lentes" && state.topic !== "consulta" && state.topic !== "conserto") {
      state.stage = "awaitingStyle";
      reply("Claro! Para direcionar melhor sua solicitação de fotos e modelos, você prefere um estilo clássico, esportivo ou moderno? As imagens e a disponibilidade serão confirmadas pela equipe.");
      return;
    }
    if (state.unit) askForConfirmation(); else askForUnit();
    return;
  }
  if (state.stage === "awaitingStyle" && style) {
    if (state.unit) askForConfirmation(); else askForUnit();
    return;
  }
  if (state.stage === "awaitingCatalogTopic" && topic) {
    if (state.unit) askForConfirmation();
    else if (topic === "sol" || topic === "grau") {
      state.stage = "awaitingStyle";
      reply("Você prefere modelos clássicos, esportivos ou modernos?");
    } else askForUnit();
    return;
  }
  if (state.stage === "awaitingUnit" && unit) { askForConfirmation(); return; }
  if (wantsHuman) { if (state.unit) askForConfirmation(); else askForUnit(); return; }
  if (asksPrice) {
    state.stage = state.unit ? "awaitingConfirmation" : "awaitingUnit";
    const subject = descriptions[state.topic] || "o produto ou serviço";
    reply(`Os valores de ${subject} podem variar conforme as opções disponíveis. ` +
      (state.unit ? `A equipe de ${state.unit} poderá orientar você. Gostaria de encaminhar a solicitação?` : "Você prefere atendimento em Itajaí ou Navegantes?"));
    return;
  }
  if (topic && state.unit) { askForConfirmation(); return; }
  if (topic) {
    state.stage = "awaitingUnit";
    reply(`Claro! Posso ajudar com informações sobre ${descriptions[topic]}. Você prefere atendimento em Itajaí ou Navegantes?`);
    return;
  }
  if (unit) {
    reply(`Certo, unidade de ${unit}! Você procura óculos, lentes de contato, informações sobre consultas ou prefere falar com a equipe?`);
    return;
  }
  if (matches(text, ["oi", "ola", "bom dia", "boa tarde", "boa noite"])) {
    reply("Olá! Que bom falar com você. Está procurando óculos, lentes de contato ou informações sobre consultas?");
    return;
  }
  reply("Quero entender melhor o que você procura. Pode me contar um pouco mais? Se preferir, também posso ajudar a direcionar você à equipe.");
}
if (form && input && messages && sendButton) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (state.busy) return;
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";
    processMessage(text);
  });
  if (resetChatButton) {
    resetChatButton.addEventListener("click", () => {
      if (state.busy) return;
      clearContext();
      state.handoffs = [];
      messages.replaceChildren();
      addMessage(WELCOME);
      input.value = "";
      input.focus();
    });
  }
} else {
  console.error("PZB-010: elementos do chat não encontrados. Verifique os IDs no index.html.");
}
