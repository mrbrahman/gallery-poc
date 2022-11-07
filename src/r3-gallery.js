// some concepts adapted from: https://dev.to/dannyengelman/web-component-102-the-5-lessons-after-learning-web-components-101-h9p



// <g-album name='Album 1' width=1000 gutterspace=4 data="[{photoid: 1, ar:1}, {photoid:2, ar: 1.33}, {photoid:5, ar:0.82}]"></g-album>

// data or data_src are okay

import {debounce} from './utils.mjs';

class R3Gallery extends HTMLElement {

  // internal variables
  #albums;
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

    this.#albums = this.data.map(d=>{

      let album = Object.assign(document.createElement('g-album'), {
        id: d.id,
        album_name: d.album,
        album_name_height: 50,
        data: d.items,
        width: this.shadowRoot.getElementById('gallery').clientWidth,
        // width: document.getElementById('main-content').clientWidth,
        gutterspace: 4
      });
    
      return album;
    });

    this.shadowRoot.getElementById('gallery').append(...this.#albums);
    this.reAssignAlbumPositions();

    this.shadowRoot.getElementById('gallery')
      .addEventListener('r3-album-height-changed', this.handleAlbumHeightChange.bind(this), true)
    ;
    
    this.shadowRoot.getElementById('gallery')
      .addEventListener('scroll', this.debounceHandleScroll)
    ;
    
    window
      .addEventListener('resize', this.debounceHandleResize)
    ;
  }
  
  handleAlbumHeightChange() {
    // apply "style: top" changes to all albums after this one
    this.reAssignAlbumPositions();
  }

  handleScroll() {
    console.log('scroll fired');
    // console.log(this.shadowRoot);
  }

  debounceHandleScroll = debounce(()=>this.handleScroll(), 100);

  handleResize() {
    console.log('resize fired');
    this.#albums.forEach(album=>{
      album.width = this.shadowRoot.getElementById('gallery').clientWidth;
      album.doLayout();
      album.paintLayout();
    });

    this.reAssignAlbumPositions();
  }

  debounceHandleResize = debounce(()=>this.handleResize(), 300);


  reAssignAlbumPositions(){
    let cumHeight = 0;
    this.#albums.forEach(album=>{
      album.style.top = cumHeight+'px';
      album.style.left = '0px';

      cumHeight += album.album_height + 40; // px between albums
    });
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
