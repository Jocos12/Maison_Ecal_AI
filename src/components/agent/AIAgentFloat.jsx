/** Opens the AI assistant window from anywhere in the app (the floating dock listens for this event). */
export function openMecalAgent(prompt) {
  window.dispatchEvent(
    new CustomEvent('mecal:open-agent', {
      detail: prompt ? { prompt } : {}
    })
  );
}
