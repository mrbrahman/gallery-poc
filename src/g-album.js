class GAlbum extends HTMLElement {
  
  _width; _gutterspace; _data; _album_name_height; _album_height; 
  
  static get observedAttributes() {
    return ['album_name','width','gutterspace','data','data_src'];
  }
  
  constructor() {
    // console.log('in constructor')
    super().attachShadow({mode: 'open'}); // sets "this" and "this.shadowRoot"
  }
  
  connectedCallback() {
    // console.log('in connectedCallback')
    this.shadowRoot.appendChild(
      document.getElementById(this.nodeName).content.cloneNode(true)
    );
    
    this.paintName();
    this.doLayout();
    // painting of layout will selectively happen from the wrapper, so not doing anything here

    this.shadowRoot.getElementById('container')
      .addEventListener('r3-item-deleted', this.handleItemDeleted.bind(this), true)
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case 'album_name':
        this.album_name = newValue;
        break;
      case 'data':
        this.data = JSON.parse(newValue)
        break;
      case 'width':
        this.width = newValue;
        break;
      case 'gutterspace':
        this.gutterspace = newValue;
        break;
    }
  }


  disconnectedCallback() {
    
  }

  handleItemDeleted(evt){
    // if an item from this album is deleted, 
    // 1. remove references to the item,
    // 2. recompute album layout, 
    // 3. and if height has changed, dispatch an event

    // remove element from the list
    let removedElementIndex = this.data.findIndex((x)=>x.elem.id==evt.detail.photoid)
    this.data.splice(removedElementIndex, 1);

    let lastAlbumHeight = this.album_height;
    // re-calc layout
    this.doLayout();

    // if there is any height change resulting from this delete, fire an event, so 
    // the wrapper r3-gallery can paint as needed
    if(lastAlbumHeight != this.album_height){
      let albumHeightChangeEvent = new CustomEvent('r3-album-height-changed');
      this.dispatchEvent(albumHeightChangeEvent);
    }

  }
  
  getMinAspectRatio(){
    if (this.width <= 640) {
      return 2;
    } else if (this.width <= 1280) {
      return 4;
    } else if (this.width <= 1920) {
      return 5;
    }
    return 6;
  }
  
  doLayout(){
    // console.log('in doLayout');
    let minAspectRatio = this.getMinAspectRatio(), row = [], rowAspectRatio = 0, 
      trX = 0, trY = this.album_name_height;

    this.data.forEach((d,i)=>{
      row.push(d);
      rowAspectRatio += d.data.ar;
      
      if (rowAspectRatio >= minAspectRatio || i+1 == this.data.length){
        // we've reached the max items possible in this row, or this is the last element
        
        // calculate row height
        // total width of images in this row = width of screen - space between images - space at the 2 ends
        
        // make sure the last image has reasonable height (not too big)
        rowAspectRatio = Math.max(rowAspectRatio, minAspectRatio);
        
        let totalWidthOfImages = this.width - (this.gutterspace * row.length-1) - this.gutterspace * 2;
        let rowHeight = totalWidthOfImages / rowAspectRatio;
        
        // add gutter space to the Y axis
        trY += this.gutterspace;
        
        // create layout objects for all entries in this row
        for(let r of row){
          trX += this.gutterspace;
          
          let o = {
            id: r.data.photoid,
            width: r.data.ar * rowHeight,
            height: rowHeight,
            offsetHeight: trY, // will be useful when painting
            trX: trX + 'px',
            trY: trY + 'px'
          };
          
          // update layout
          r.layout = o;
          
          trX += r.data.ar * rowHeight; // add the current element width
        }
        // reset values
        trX = 0;
        trY += rowHeight;      
        row = []; 
        rowAspectRatio = 0;
      }
    });

    this.album_height = trY;
    this.shadowRoot.getElementById('container').style.height = this.album_height+'px';
  }
  
  selectivelyPaintLayout(bufferTop, bufferBottom, albumTop){
    // console.log('in selectivelyPaintLayout')

    this.data.forEach(x=>{

      let thumbTop = albumTop + x.layout.offsetHeight, thumbBottom = thumbTop + x.height;
      
      // add/remove/leave as is from DOM as appropriate
      if ((thumbTop    >= bufferTop && thumbTop    <= bufferBottom) ||
          (thumbBottom >= bufferTop && thumbBottom <= bufferBottom))
      {
        // album is within the boundaries
        if(x.elem == undefined){
          // create element in dom
          let elem = Object.assign(document.createElement('g-thumb'), {
            id: x.data.photoid,
            photoid: x.data.photoid,
            width: x.layout.width,
            height: x.layout.height,
            rating: x.data.rating
          });
          elem.style.transform = `translate(${x.layout.trX},${x.layout.trY})`
          
          // keep reference in this.data
          x.elem = elem;
          
          this.shadowRoot.getElementById('container').appendChild(elem);

        } else if (!x.elem.isConnected){
          // the thumb was removed, but element (class) was found - just append the element back into the DOM
          this.shadowRoot.getElementById('container').appendChild(x.elem);
        } else {
          // just update the new position (for resize / delete events)
          x.elem.width = x.layout.width;
          x.elem.height = x.layout.height;
          x.elem.style.transform = `translate(${x.layout.trX},${x.layout.trY})`
        }
      } else {
        // album is not within boundaries

        // remove the item from DOM if present
        if(x.elem !== undefined){
          // remove element in shadow dom
          x.elem.remove();
        }
      }
      
    })
  }


  paintName(){
    this.shadowRoot.getElementById('album-name').innerHTML = `<div>${this.album_name}</div>`;
    this.shadowRoot.getElementById('album-name').style.height = this.album_name_height + 'px';
  }
  // boilerplate
  // return ['name','width','gutterspace','data','data_src'];
  get album_name(){
    return this._album_name;
  }
  set album_name(_){
    this._album_name = _;
  }
  
  get width(){
    return this._width;
  }
  set width(_){
    this._width = _;
  }

  get gutterspace(){
    return this._gutterspace;
  }
  set gutterspace(_){
    this._gutterspace = _;
  }

  get data(){
    return this._data;
  }
  set data(_){
    // create a placeholder for the element
    // this will be further updated with the layout and actual element reference
    this._data = _.map(x=>{
      return {
        data : { ...x }
      }
    });
    // console.log(this._data)
  }

  get album_name_height(){
    return this._album_name_height;
  }
  set album_name_height(_){
    this._album_name_height = +_;
  }

  get album_height(){
    return this._album_height;
  }
  set album_height(_){
    this._album_height = +_;
  }
  
}

customElements.define('g-album', GAlbum);

