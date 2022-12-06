// some concepts adapted from: https://dev.to/dannyengelman/web-component-102-the-5-lessons-after-learning-web-components-101-h9p



// <r3-album name='Album 1' width=1000 gutterspace=4 data="[{id: 1, ar:1}, {id:2, ar: 1.33}, {id:5, ar:0.82}]"></r3-album>

// data or data_src are okay

import {debounce, throttle} from './utils.mjs';

class R3Gallery extends HTMLElement {

  // internal variables
  #albums = []; #albumsInBuffer = {}; #itemsSelectedCnt = 0;
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

      let album = Object.assign(document.createElement('r3-album'), {
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

    this.addEventListener('r3-album-height-changed', this.#handleAlbumHeightChange);

    this.addEventListener('r3-album-empty', this.#removeAlbum);

    this.addEventListener('r3-album-item-selected', this.#handleItemsSelected);

    this.addEventListener('r3-gallery-controls-closed', this.#handleGalleryControlsClosed);

    this.addEventListener('r3-gallery-controls-rating-changed', this.#handleGalleryControlsRatingChanged);
    
    this.addEventListener('r3-gallery-events-delete-pressed', this.#handleGalleryControlsDeletePressed);

    this.shadowRoot.getElementById('gallery')
      .addEventListener('scroll', this.#throttleHandleScroll)
    ;
    
    window.addEventListener('resize', this.#throttleHandleResize)
    ;
  }

  #handleItemsSelected = (evt)=>{
    // console.log(evt.detail.cnt);
    this.#itemsSelectedCnt += evt.detail.cnt;

    if(this.#itemsSelectedCnt > 0){
      if(!this.shadowRoot.querySelector('r3-gallery-controls')){
        let c = document.createElement('r3-gallery-controls');
        this.shadowRoot.getElementById('gallery').append(c);
        c.ctr = this.#itemsSelectedCnt;
        
        // this is needed to enable transition
        setTimeout(()=>{
          c.style.top = '80%';
        }, 10);

      } else {
        this.shadowRoot.querySelector('r3-gallery-controls').ctr = this.#itemsSelectedCnt;
      }
      
    } else if(this.#itemsSelectedCnt == 0){

      let c = this.shadowRoot.querySelector('r3-gallery-controls');
      c.ctr = 0;
      c.style.top = '100%';
      
      // TODO: wait for CSS animation to complete
      setTimeout(()=>{
        c.remove();
      }, 400);
    }

    console.log(this.#itemsSelectedCnt);

    
  }

  #handleGalleryControlsClosed = ()=>{
    this.#albums.forEach(album=>{
      album.unselectSelectedItems();
    });
    console.log(this.#itemsSelectedCnt);

  }

  #handleGalleryControlsRatingChanged = (evt)=>{
    this.#albums.forEach(album=>{
      album.changeRatingSelectedItems(evt.detail.newRating);
    });
  }

  #handleGalleryControlsDeletePressed = (evt)=>{
    console.log('in delete pressed');
    this.#albums.forEach(album=>album.deleteSelectedItems());

    console.log(this.#itemsSelectedCnt);
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
    // console.log('in handleAlbumHeightChange')
    // apply "style: top" changes to all albums
    this.#reAssignAlbumPositions();
    // bring more items to the buffer, or remove items from buffer as necessary
    // need to wait for the album height animation to complete
    // so 'offsetTop' value is properly obtained
    setTimeout(() => {
      this.#selectivelyPaintAlbums();
    }, 400);
  }

  #removeAlbum = (evt) => {
    let deletedAlbumId = evt.composedPath()[0].id;

    let idx = this.#albums.findIndex(x=>x.id == deletedAlbumId);

    // remove the album from DOM as well as reference in array
    this.shadowRoot.getElementById(deletedAlbumId).remove();
    this.#albums.splice(idx, 1);
    delete(this.#albumsInBuffer[deletedAlbumId]);

    this.#handleAlbumHeightChange();

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
        console.log(`not doing ${album.id}`);
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

    // TODO other listeners
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
