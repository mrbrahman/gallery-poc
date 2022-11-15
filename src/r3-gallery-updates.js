class R3GalleryUpdates extends HTMLElement {
  #ctr; 

  constructor() {
    super().attachShadow({mode: 'open'}); // sets "this" and "this.shadowRoot"
  }

  connectedCallback() {
    this.shadowRoot.appendChild(
      document.getElementById(this.nodeName).content.cloneNode(true)
    );

    this.shadowRoot.getElementById("close")
      .addEventListener('click', this.handleClose.bind(this))
    ;
  }

  handleClose(evt){
    let closed = new Event('r3-gallery-updates-closed');
    this.dispatchEvent(closed);
  }

  disconnectedCallback() {
    //implementation
  }

  attributeChangedCallback(name, oldVal, newVal) {
    //implementation
  }

  adoptedCallback() {
    //implementation
  }

  #paintCtr(){
    this.shadowRoot.getElementById("ctr").innerHTML = this.ctr;
  }

  get ctr(){
    return this.#ctr;
  }
  set ctr(_){
    this.#ctr = +_;
    if(this.isConnected){
      this.#paintCtr();
    }
  }

}

window.customElements.define('r3-gallery-updates', R3GalleryUpdates);