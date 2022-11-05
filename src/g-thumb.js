class GThumb extends HTMLElement {
  // instance variables
  inDOM;
  _photoid; _width; _height; _rating; _selected;
  
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
    this.shadowRoot.querySelector('sl-rating').removeEventListener('deleted', this.slRatingChanged);
    this.shadowRoot.querySelector('sl-icon-button[name="trash"]').removeEventListener('sl-change', this.itemDeleted);
    
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
    
    const deleteEvent = new CustomEvent('r3-item-deleted', {detail: {photoid: parent._photoid} });
    this.shadowRoot.querySelector('sl-icon-button[name="trash"]').addEventListener('click', function itemDeleted(){
      // TODO: delete item from system (make REST call)
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
