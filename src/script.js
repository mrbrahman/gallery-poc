// some concepts adapted from: https://dev.to/dannyengelman/web-component-102-the-5-lessons-after-learning-web-components-101-h9p
class GThumb extends HTMLElement {
  // instance variables
  inDOM;
  _photoid;_width; _height; _rating; _selected;
  
  dppx = parseFloat(window.devicePixelRatio.toFixed(2));
  
  static get observedAttributes() {
    return ['photoid','rating','width','height','selected'];
  }
  
  constructor() {
    // console.log('in constructor')
    super().attachShadow({mode: 'open'}); // sets "this" and "this.shadowRoot"
    this.inDOM = false;
    // console.log(this.dppx)
  }

  connectedCallback() {
    this.inDOM = true;
    
    // console.log('in connected callback');
    // if(!(this._photoid && this._rating && this._width && this._height) ){
    //   return;
    // }
    
    this.shadowRoot.appendChild(
      document.getElementById(this.nodeName).content.cloneNode(true)
    );

    
    // create a placeholder regardless of whether the element is still in DOM
    this.paintWidth();
    this.paintHeight();
    // console.log(this.parentNode.offsetWidth);
    
    // wait for an arbitrary 250ms and create & paint the rest of the shadow DOM
    // this is so that in case the user is scrolling too fast, we don't download the image unnessarily or call the other sl (shoelace) web components or setup the listeners
    setTimeout(this.paintRest(), 250);
    
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    // console.log(`setting ${name} from *${oldValue}* to *${newValue}*`)
    switch(name){
      case 'photoid':
        this._photoid = newValue;
        break;
      case 'width':
        this._width = +newValue;
        this.paintWidth();
        break;
      case 'height':
        this._height = +newValue;
        this.paintHeight();
        break;
      case 'rating':
        this._rating = newValue;
        this.paintRating();
        break;
      case 'selected':
        this._selected = newValue == null ? false : true;
        this.paintSelected();
        break;
    }
  }
  
  disconnectedCallback() {
    this.inDOM = false;
    // TODO: can we check if the listner is setup before removing?
    // TODO: also check if we need to remove these listeners explicitly, since we're removing the 
    // shadow DOM anyway, and the listeners should get automatically removed by browser
    
    // console.log('in dicsonnectedCallback');
    this.shadowRoot.querySelector('input[type="checkbox"]').removeEventListener('click', this.handleSelection);
    this.shadowRoot.querySelector('sl-rating').removeEventListener('deleted', this.itemDeleted);
    this.shadowRoot.querySelector('sl-icon-button[name="trash"]').removeEventListener('sl-change', this.slRatingChanged);
    
    // remove shadow DOM
    this.shadowRoot.innerHTML = "";
  }
  
  paintRest(){
    // if the user is scrolling too fast, and the element is already removed, do not paint anything further
    if(!this.inDOM){
      return;
    }
    
    // create the rest of the elements
    this.shadowRoot.getElementById('container').innerHTML = `
      <input type="checkbox" id="chk">
      <label for="chk"></label>

      <img />
      <sl-rating label="Rating"></sl-rating>
      <sl-icon-button name="trash"></sl-icon-button>
    `
    
    // now paint them
    this.paintSrc();
    this.paintRating();
    this.paintSelected();
    
    // setup event listeners
    let parent = this;
    this.shadowRoot.querySelector('input[type="checkbox"]').addEventListener('click', function handleSelection(){
      parent._selected = this.checked;
    });
    
    this.shadowRoot.querySelector('sl-rating').addEventListener('sl-change', function slRatingChanged(){
      parent._rating = this.value;
      console.log(`new value: ${this.value} to be updated in db`);
    });
    
    const deleteEvent = new Event('deleted');
    this.shadowRoot.querySelector('sl-icon-button[name="trash"]').addEventListener('click', function itemDeleted(){
      console.log('dispatching delete event');
      parent.dispatchEvent(deleteEvent);
      parent.shadowRoot.querySelector('#container').classList.add('removed');
      // TODO: add listener to wait for CSS animation completion, rather than hardcode 400ms
      setTimeout(()=>parent.remove(), 400);
    })
    
  }
  
  // individual paint functions
  // checking for this.inDOM in each, as these get triggered for static elements
  // that use attributeChangedCallback to set the values before connectedComponents is called
  paintWidth(){
    if(this.inDOM){
      this.shadowRoot.getElementById('container').style.width = this._width+'px';
    }
  }
  paintHeight(){
    if(this.inDOM){
      this.shadowRoot.getElementById('container').style.height = this._height+'px';
    }
  }
  paintSrc(){
    if(this.inDOM){
      let img = this.shadowRoot.querySelector('img');
      img.onload = function(){
        this.classList.add('ready');
      };
      // console.log(`need ${this._height * this.dppx} px`)
      img.src = `https://picsum.photos/id/${this._photoid}/${Math.round(this._width)}/${Math.round(this._height)}`;
    } 
  }
  paintRating(){
    if(this.inDOM){
      this.shadowRoot.querySelector('sl-rating').value = this._rating;
    }
  }
  paintSelected(){
    if(this.inDOM){
      this.shadowRoot.querySelector('input[type="checkbox"]').checked = this._selected;
    }
  }
  
  // boilerplate stuff
  get photoid(){
    return this._width;
  }
  set photoid(_){
    this._photoid = _;
    // nothing to paint
  }
  
  get width(){
    return this._width;
  }
  set width(_){
    this._width = +_;
    this.paintWidth();
  }
  
  get height(){
    return this._height;
  }
  set height(_){
    this._height = +_;
    this.paintHeight();
  }
  
  get rating(){
    return this._rating;
  }
  set rating(_){
    this._rating = _;
    this.paintRating();
  }
  
  get selected(){
    return this._selected;
  }
  set selected(_){
    this._selected = _
    this.paintSelected();
  }

}

customElements.define('g-thumb', GThumb);


// <g-album name='Album 1' width=1000 gutterspace=4 data="[{photoid: 1, ar:1}, {photoid:2, ar: 1.33}, {photoid:5, ar:0.82}]"></g-album>

// data or data_src are okay

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

    this._data.forEach((x,i)=>{
      
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
          this.data[i].elem = elem;
          this.shadowRoot.getElementById('container').appendChild(elem);
        }
        
        // else item is already in DOM; do nohing
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


class R3Gallery extends HTMLElement {

  _cum_height = 0; _albums;
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
    // this.shadowRoot.getElementById('gallery').style.height = this._cum_height+'px';
    this.shadowRoot.getElementById('gallery').addEventListener('scroll', function(event){
      console.log('scroll fired')
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
