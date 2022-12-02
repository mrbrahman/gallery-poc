class R3AlbumName extends HTMLElement {

  #albumName; #select='none';

  constructor() {
    super().attachShadow({mode: 'open'}); // sets "this" and "this.shadowRoot"
  }

  connectedCallback() {
    this.shadowRoot.appendChild(
      document.getElementById(this.nodeName).content.cloneNode(true)
    );

    this.#paintAlbumName();

    this.shadowRoot.getElementById("select-all").addEventListener('click', this.#handleSelectAll);
    
    this.shadowRoot.getElementById("album-name").addEventListener('focus', this.#handleFocus);
    this.shadowRoot.getElementById("album-name").addEventListener('blur', this.#handleBlur);
    this.shadowRoot.getElementById("album-name").addEventListener('keyup', this.#handleEscape);

    this.shadowRoot.getElementById("save").addEventListener('click', this.#handleSave);

    this.shadowRoot.getElementById("cancel").addEventListener('click', this.#handleCancel);

  }

  #handleSelectAll = (evt) => {
    let classes = ['select-none','select-some','select-all'];

    switch(this.#select){
      // moving from none to all
      case 'none':
        evt.target.name = "check-circle-fill";
        evt.target.classList.remove(...classes);
        evt.target.classList.add('select-all');
        this.#select = 'all';
        break;
      // moving from some/all to none
      case 'some':
      case 'all':
        evt.target.name = "check-circle";
        evt.target.classList.remove(...classes);
        evt.target.classList.add('select-none');
        this.#select = 'none';
        break;
    }
    this.dispatchEvent(new CustomEvent('r3-select-all-clicked', {detail: {select: this.#select}}));
  }

  #handleSave = (evt) => {
    if(this.shadowRoot.getElementById('album-name').innerText != this.albumName){
      console.log('TODO: save in db');
      this.albumName = this.shadowRoot.getElementById('album-name').innerText;
      // TODO: notify of successful change
      this.shadowRoot.getElementById('edit-controls').style.visibility = 'hidden';
    }
  }

  #handleCancel = (evt) => {
    if(this.shadowRoot.getElementById('album-name').innerText != this.albumName){
      this.shadowRoot.getElementById('album-name').innerText = this.albumName;
    }

    this.shadowRoot.getElementById('album-name').blur();
    this.shadowRoot.getElementById('edit-controls').style.visibility = 'hidden';
  }

  // #handleHover = (evt) => {
  //   console.log('in handle hover')
  // }

  #handleFocus = (evt) => {
    this.shadowRoot.getElementById('edit-controls').style.visibility = 'visible';
  }

  #handleBlur = (evt) => {
    // if there are changes made to album name and not saved, notify, else silently remove 
    if(this.shadowRoot.getElementById('album-name').innerText == this.albumName){
      this.shadowRoot.getElementById('edit-controls').style.visibility = 'hidden';
    }
    // else ... ideally notify that user needs to save, however, 
    // cannot notify here since blur is called even when save is pressed (before save is called)
  }

  #handleEscape = (evt) => {
    if (evt.key == "Escape"){
      this.#handleCancel();
    }
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

  #paintAlbumName() {
    this.shadowRoot.getElementById('album-name').innerText = this.#albumName;
  }

  get albumName() {
    return this.#albumName;
  }
  set albumName(_) {
    this.#albumName = _;
    if(this.isConnected){
      this.#paintAlbumName();
    }
  }

}

window.customElements.define('r3-album-name', R3AlbumName);
