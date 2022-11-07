class GAlbum extends HTMLElement {
  
  _width; _gutterspace; _data; _album_name_height;
  _album_height; 
  
  static get observedAttributes() {
    return ['albumname','width','gutterspace','data','data_src'];
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
    
    this.doLayout();
    this.paintLayout();

    this.shadowRoot.getElementById('container')
      .addEventListener('r3-item-deleted', this.handleItemDeleted.bind(this), true)
  }

  handleItemDeleted(evt){
    // if an item from this album is deleted, 
    // 1. remove references to the item,
    // 2. recompute album layout, 
    // 3. paint album 
    // 4. and if height has changed, dispatch an event

    // remove element from the list
    let removedElementIndex = this._data.findIndex((x)=>x.elem.id==evt.detail.photoid)
    this._data.splice(removedElementIndex, 1);

    let lastAlbumHeight = this._album_height;
    // re-calc layout, and paint
    this.doLayout();
    this.paintLayout();

    if(lastAlbumHeight != this._album_height){
      let albumHeightChangeEvent = new CustomEvent('r3-album-height-changed');
      this.dispatchEvent(albumHeightChangeEvent);
    }

  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case 'albumname':
        this._name = newValue;
        break;
      case 'data':
        this._data = JSON.parse(newValue).map(x=>{
          return {
            data : { ...x }
          }
        });
        break;
      case 'width':
        this._width = +newValue;
        break;
      case 'gutterspace':
        this._gutterspace = +newValue;
        break;
    }
  }

  disconnectedCallback() {
    
  }
  
  getMinAspectRatio(){
    if (this._width <= 640) {
      return 2;
    } else if (this._width <= 1280) {
      return 4;
    } else if (this._width <= 1920) {
      return 5;
    }
    return 6;
  }
  
  doLayout(){
    // console.log('in doLayout');
    let minAspectRatio = this.getMinAspectRatio(), row = [], rowAspectRatio = 0, 
      trX = 0, trY = this._album_name_height;

    this._data.forEach((d,i)=>{
      row.push(d);
      rowAspectRatio += d.data.ar;
      
      if (rowAspectRatio >= minAspectRatio || i+1 == this._data.length){
        // we've reached the max items possible in this row, or this is the last element
        
        // calculate row height
        // total width of images in this row = width of screen - space between images - space at the 2 ends
        
        // make sure the last image has reasonable height (not too big)
        rowAspectRatio = Math.max(rowAspectRatio, minAspectRatio);
        
        let totalWidthOfImages = this._width - (this._gutterspace * row.length-1) - this._gutterspace * 2;
        let rowHeight = totalWidthOfImages / rowAspectRatio;
        
        // add gutter space to the Y axis
        trY += this._gutterspace;
        
        // create layout objects for all entries in this row
        for(let r of row){
          trX += this._gutterspace;
          
          let o = {
            id: r.data.photoid,
            width: r.data.ar * rowHeight,
            height: rowHeight,
            offsetHeight: trY + rowHeight, // will be useful when painting
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

    this._album_height = trY;
    this.shadowRoot.getElementById('container').style.height = this._album_height+'px';
  }
  
  paintLayout(){
    // console.log('in paintLayout')
    this.shadowRoot.getElementById('album-name').innerHTML = `<div>${this._albumname}</div>`;
    this.shadowRoot.getElementById('album-name').style.height = this._album_name_height + 'px';

    this._data.forEach(x=>{
      
      // add/remove/leave as is from DOM as appropriate
      if(true){ // TODO fix this
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
          
          // keep reference in this._data
          x.elem = elem;
          
          this.shadowRoot.getElementById('container').appendChild(elem);
        } else {
          // just update the new position
          x.elem.width = x.layout.width;
          x.elem.height = x.layout.height;
          x.elem.style.transform = `translate(${x.layout.trX},${x.layout.trY})`
        }
      } else {
        // remove the item from DOM if present
        if(x.elem !== undefined){
          // remove element in shadow dom
          x.elem.remove();
          delete x.elem; // remove any references, so the HTMLElement can be garbage collected
        }
      }
      
    })
  }
  
  paintName(){
    
  }
  // boilerplate
  // return ['name','width','gutterspace','data','data_src'];
  get albumname(){
    return this._albumname;
  }
  set albumname(_){
    this._albumname = _;
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

  get albumnameheight(){
    return this._album_name_height;
  }
  set albumnameheight(_){
    this._album_name_height = +_;
  }

  get albumheight(){
    return this._album_height;
  }
  set albumheight(_){
    // nothing to set
    console.error("We don't set album height");
  }
  
}

customElements.define('g-album', GAlbum);

