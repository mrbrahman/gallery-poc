// some concepts adapted from: https://dev.to/dannyengelman/web-component-102-the-5-lessons-after-learning-web-components-101-h9p



// <g-album name='Album 1' width=1000 gutterspace=4 data="[{photoid: 1, ar:1}, {photoid:2, ar: 1.33}, {photoid:5, ar:0.82}]"></g-album>

// data or data_src are okay

import {debounce, throttle} from './utils.mjs';

class R3Gallery extends HTMLElement {

  // internal variables
  #albums = []; #albumsInBuffer = {}; #itemsSelected = [];
  // variables that can be get/set
  #data;

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
        data: d.items,
        width: this.shadowRoot.getElementById('gallery').clientWidth
      });
    
      return album;
    });

    this.shadowRoot.getElementById('gallery').append(...this.#albums);
    this.#reAssignAlbumPositions();
    this.#selectivelyPaintAlbums();

    this.shadowRoot.getElementById('gallery')
      .addEventListener('r3-album-height-changed', this.#handleAlbumHeightChange, true)
    ;

    this.shadowRoot.getElementById('gallery')
      .addEventListener('r3-item-selected', this.#handleItemSelected)
    ;

    this.shadowRoot.getElementById('gallery')
      .addEventListener('r3-gallery-controls-closed', this.#handleGalleryUpdatesClosed)
    ;

    this.shadowRoot.getElementById('gallery')
      .addEventListener('r3-gallery-controls-rating-changed', this.#handleGalleryUpdatesRatingChanged)
    ;
    
    this.shadowRoot.getElementById('gallery')
      .addEventListener('scroll', this.#throttleHandleScroll)
    ;
    
    window
      .addEventListener('resize', this.#throttleHandleResize)
    ;
  }

  #handleItemSelected = (evt)=>{
    let item = evt.composedPath()[0];

    if(item.selected){
      this.#itemsSelected.push(item);
    } else {
      let idx = this.#itemsSelected.findIndex((x)=>x.id==item.id)
      this.#itemsSelected.splice(idx, 1);
    }

    if(this.#itemsSelected.length > 0){
      if(!this.shadowRoot.querySelector('r3-gallery-controls')){
        let u = document.createElement('r3-gallery-controls');
        this.shadowRoot.getElementById('gallery').append(u);
        u.ctr = 1;

        u.style.top = this.parentNode.clientHeight + 'px';
        
        // this is to enable the transition effect. TODO: Is there a better way?
        setTimeout(()=>{
          u.style.top = '150px'; //this.parentNode.clientHeight - 65 + 'px';
        });
      } else {
        this.shadowRoot.querySelector('r3-gallery-controls').ctr = this.#itemsSelected.length;
      }
      

    } else if(this.#itemsSelected.length == 0){
      this.shadowRoot.querySelector('r3-gallery-controls').ctr = 0;
      this.shadowRoot.querySelector('r3-gallery-controls').style.top = this.parentNode.clientHeight + 'px';
      
      // TODO: use a listener to wait for CSS transition to complete
      setTimeout(()=>{
        this.shadowRoot.querySelector('r3-gallery-controls').remove();
      }, 400);
    }

  }

  #handleGalleryUpdatesClosed = ()=>{
    this.#itemsSelected.forEach(x=>{
      x.selected = false;
    });

    this.#itemsSelected = [];

    this.shadowRoot.querySelector('r3-gallery-controls').ctr = 0;
    this.shadowRoot.querySelector('r3-gallery-controls').style.top = this.parentNode.clientHeight + 'px';
    
    // TODO: use a listener to wait for CSS transition to complete
    setTimeout(()=>{
      this.shadowRoot.querySelector('r3-gallery-controls').remove();
    }, 400);
  }

  #handleGalleryUpdatesRatingChanged = (evt)=>{
    console.log('mass update in DB and files exif');

    this.#itemsSelected.forEach(x=>{
      x.rating = evt.detail.newRating;
    });

  }

  #reAssignAlbumPositions(){
    let cumHeight = 0;
    this.#albums.forEach(album=>{
      album.style.top = cumHeight+'px';
      album.style.left = '0px';

      cumHeight += album.album_height + 40; // px between albums
    });
  }
  
  #handleAlbumHeightChange = () => {
    // apply "style: top" changes to all albums
    this.#reAssignAlbumPositions();
    // bring more items to the buffer, or remove items from buffer as necessary
    this.#selectivelyPaintAlbums();
  }

  #selectivelyPaintAlbums(forceRepaint = true) {
    
    //   --------------------------------------- bufferTop (-ve value)
    //
    //
    //
    //   --------------------------------------- 0px
    //                    ^
    //                    |
    //                    |
    //                 Viewport
    //                    |
    //                    |
    //                    v
    //   ---------------------------------------
    //
    //
    //
    //   --------------------------------------- bufferBottom
    
    // for easy comparisons, we convert scroll to a -ve number
    
    let scrollTop = -this.shadowRoot.getElementById('gallery').scrollTop;
    // console.log(`scrollTop ${scrollTop}`)
    
    // we make the buffers on each side 6 times the size of the screen

    // bufferTop: px above the top of the viewport
    // bufferBottom: px below the bottom of the viewport
    let viewportHeight = this.shadowRoot.getElementById('gallery').clientHeight,
      bufferTop = viewportHeight * -6, 
      bufferBottom = viewportHeight * (1+6);
    
    // console.log(`bufferTop ${bufferTop} bufferBottom ${bufferBottom}`)
    
    this.#albums.forEach(album=>{
      let albumTop = album.offsetTop + scrollTop, albumBottom = albumTop + album.album_height;
      // console.log(`id: ${album.id} albumTop ${albumTop} albumBottom ${albumBottom}`)

      let albumBottomInBuffer = () => (albumBottom >= bufferTop && albumBottom <= bufferBottom);
      let albumTopInBuffer    = () => (albumTop    >= bufferTop && albumTop    <= bufferBottom);
      let albumEncompassesBuffer = () => (albumTop <= bufferTop && albumBottom >= bufferBottom);
      
      // in case the full album was already loaded in the buffer, and the entire album continues to exist,
      // take a shortcut and no need to adjust anything, unless explicitly set during the function call.
      
      // for e.g. scroll doesn't need to repaint everything, however, a delete or album height change will
      // need to repaint even though the entire album may have already been loaded and contines to exist in the buffer
      if (
        !forceRepaint &&
        this.#albumsInBuffer[album.id] && this.#albumsInBuffer[album.id] == 'full' && // full album is loaded
        albumBottomInBuffer() && albumTopInBuffer()
      ) {
        // don't need to do anything
        console.log(`not doing ${album.id}`)
        return;
      }

      if (albumEncompassesBuffer()){
        this.#albumsInBuffer[album.id] = 'buffer-overflow';
        album.selectivelyPaintLayout(bufferTop, bufferBottom, albumTop);
      }
      // if albumTop is within the buffer or albumBottom is within the buffer, we need to show
      // (at least part of) the album
      else if (albumBottomInBuffer() || albumTopInBuffer()) {
        album.selectivelyPaintLayout(bufferTop, bufferBottom, albumTop);
        
        if (albumBottomInBuffer() && albumTopInBuffer()){
          this.#albumsInBuffer[album.id] = 'full';

        } else {
          this.#albumsInBuffer[album.id] = 'partial';
        }
        
      } else {
        // the album is not within the buffered area
        
        if(this.#albumsInBuffer[album.id]){
          // if the album was in the buffered area before, selectively paint layout once more,
          // so any visible thumbs can be removed
          album.selectivelyPaintLayout(bufferTop, bufferBottom, albumTop);
          delete this.#albumsInBuffer[album.id];
        }
      }
    });

    console.log(this.#albumsInBuffer)
  }

  #throttleHandleScroll = throttle(()=>this.#selectivelyPaintAlbums(false), 100);

  #handleResize() {
    // apply the new width to all albums
    this.#reAssignAlbumWidths();
    // re-assign album positions, and selectively paint
    this.#handleAlbumHeightChange();
  }
  
  #reAssignAlbumWidths(){
    this.#albums.forEach(album=>{
      album.width = this.shadowRoot.getElementById('gallery').clientWidth;
      album.redoLayout();
    });
  }

  //debounceHandleResize = debounce(()=>this.#handleResize(), 300);
  #throttleHandleResize = throttle(()=>this.#handleResize(), 100);

  disconnectedCallback() {
    this.shadowRoot.getElementById('gallery')
      .removeEventListener('r3-album-height-changed', this.#handleAlbumHeightChange)
    ;
  
    this.shadowRoot.getElementById('gallery')
      .removeEventListener('scroll', this.#throttleHandleScroll)
    ;
    
    window
      .removeEventListener('resize', this.#throttleHandleResize)
    ;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    //implementation
  }

  adoptedCallback() {
    console.log('in adoptedCallback')
  }

  get data(){
    return this.#data;
  }
  set data(_){
    this.#data = _;
  }

  get data_src(){
    return this._data_src;
  }
  set data_src(_){
    this._data_src = _;
    // do a fetch and set this.#data
  }

}

window.customElements.define('r3-gallery', R3Gallery);
