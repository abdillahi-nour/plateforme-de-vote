class ShadowDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        .dialog-box {
          background: white;
          padding: 20px;
          border-radius: 8px;
          min-width: 300px;
          max-width: 80%;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .title {
          font-size: 1.2em;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .message {
          margin-bottom: 20px;
        }
        .buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
      </style>
      <div class="dialog-box">
        <div class="title" id="title"></div>
        <div class="message" id="message"></div>
        <div class="buttons" id="buttons"></div>
      </div>
    `;
  }

  show({ type, title, message, buttons = ['OK'] }) {
    this.shadowRoot.getElementById('title').className = type;
    this.shadowRoot.getElementById('title').textContent = title;
    this.shadowRoot.getElementById('message').textContent = message;
    
    const buttonsContainer = this.shadowRoot.getElementById('buttons');
    buttonsContainer.innerHTML = '';
    
    buttons.forEach(btnText => {
      const button = document.createElement('button');
      button.textContent = btnText;
      button.onclick = () => this.hide();
      buttonsContainer.appendChild(button);
    });
    
    this.style.display = 'flex';
  }

  hide() {
    this.style.display = 'none';
  }
}

customElements.define('shadow-dialog', ShadowDialog);