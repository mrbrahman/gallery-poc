// some concepts adapted from: https://dev.to/dannyengelman/web-component-102-the-5-lessons-after-learning-web-components-101-h9p



// <g-album name='Album 1' width=1000 gutterspace=4 data="[{photoid: 1, ar:1}, {photoid:2, ar: 1.33}, {photoid:5, ar:0.82}]"></g-album>

// data or data_src are okay


class R3Gallery extends HTMLElement {

  // internal variables
  _cum_height = 0; _albums;
  // variables that can be get/set
  _data;

  constructor() {
    // console.log('in constructor')
    super().attachShadow({mode: 'open'}); // sets "this" and "this.shadowRoot"
  }

  connectedCallback() {
    this.shadowRoot.appendChild(
      document.getElementById(this.nodeName).content.cloneNode(true)
    );

    this._albums = this._data.map(d=>{

      let album = Object.assign(document.createElement('g-album'), {
        id: d.id,
        albumname: d.album,
        albumnameheight: 50,
        data: d.items,
        width: document.getElementById('main-content').clientWidth,
        gutterspace: 4
      });
    
      album.style.top = this._cum_height+'px';
      album.style.left = '0px';

      this.shadowRoot.getElementById('gallery').appendChild(album);
      this._cum_height += album.albumheight + 40; // px between albums
  
      return album;
    });
    
    this.shadowRoot.getElementById('gallery').addEventListener('scroll', function(event){
      console.log('scroll fired');
    });

    this.shadowRoot.getElementById('gallery').addEventListener('album-height-changed', function handleAlbumHeightChange(evt){
      // apply "top" changes to all albums after this one
    })
  
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

  get data(){
    return this._data;
  }
  set data(_){
    this._data = _;
  }

  get data_src(){
    return this._data_src;
  }
  set data_src(_){
    this._data_src = _;
    // do a fetch and set this._data
  }

}

window.customElements.define('r3-gallery', R3Gallery);
