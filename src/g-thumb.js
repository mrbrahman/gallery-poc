class GThumb extends HTMLElement {
  // instance variables
  #photoid; #width; #height; #rating; #selected;
  
  #dppx = parseFloat(window.devicePixelRatio.toFixed(2));
  
  static get observedAttributes() {
    return ['photoid','rating','width','height','selected'];
  }
  
  constructor() {
    // console.log('in constructor')
    super().attachShadow({mode: 'open'}); // sets "this" and "this.shadowRoot"
    // console.log(this.#dppx)
  }

  connectedCallback() {
    
    // console.log('in connected callback');
    // TODO: handle this properly. rating can have 0 value
    // if(!(this.#photoid && this.#rating && this.#width && this.#height) ){
    //   return;
    // }
    
    this.shadowRoot.appendChild(
      document.getElementById(this.nodeName).content.cloneNode(true)
    );

    
    // create a placeholder regardless of whether the element is still in DOM
    this.#paintWidth();
    this.#paintHeight();
    // console.log(this.parentNode.offsetWidth);
    
    // wait for an arbitrary 250ms and create & paint the rest of the shadow DOM
    // this is so that in case the user is scrolling too fast, we don't download the image unnessarily or call the other sl (shoelace) web components or setup the listeners
    setTimeout(this.#paintRest(), 250);
    
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    // console.log(`setting ${name} from *${oldValue}* to *${newValue}*`)

    // use the "setters" to set the new values, so that any logic can be done in one place
    switch(name){
      case 'photoid':
        this.photoid = newValue;
        break;
      case 'width':
        this.width = newValue;
        break;
      case 'height':
        this.height = newValue;
        break;
      case 'rating':
        this.rating = newValue;
        break;
      case 'selected':
        this.selected = newValue == null ? false : true;
        break;
    }
  }
  
  disconnectedCallback() {
    // TODO: can we check if the listner is setup before removing?
    // TODO: also check if we need to remove these listeners explicitly, since we're removing the 
    // shadow DOM anyway, and the listeners should get automatically removed by browser
    
    // console.log('in dicsonnectedCallback');
    this.shadowRoot.querySelector('input[type="checkbox"]').removeEventListener('click', this.#handleSelection);
    this.shadowRoot.querySelector('sl-rating').removeEventListener('deleted', this.#slRatingChanged);
    this.shadowRoot.querySelector('sl-icon-button[name="trash"]').removeEventListener('sl-change', this.#itemDeleted);
  }
  
  #paintRest(){
    // if the user is scrolling too fast, and the element is already removed, do not paint anything further
    if(!this.isConnected){
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
    this.#paintSrc();
    this.#paintRating();
    this.#paintSelected();
    
    // setup event listeners
    this.shadowRoot.querySelector('input[type="checkbox"]')
      .addEventListener('click', this.#handleSelection.bind(this));
    
    this.shadowRoot.querySelector('sl-rating')
      .addEventListener('sl-change', this.#slRatingChanged.bind(this));
    
    this.shadowRoot.querySelector('sl-icon-button[name="trash"]')
    .addEventListener('click', this.#itemDeleted.bind(this))
    
  }

  #handleSelection(evt){
    this.#selected = evt.target.checked;
  }

  #slRatingChanged(evt){
    let r = evt.target.value
    console.log(`new value: ${r} to be updated in db`);
    this.#rating = r;
}
  
  #itemDeleted(evt){
    // TODO: delete item from system (make REST call)
    // console.log('dispatching delete event');
    console.log('Delete from server/db here for photoid '+this.photoid);

    const deleteEvent = new CustomEvent('r3-item-deleted', {detail: {photoid: this.photoid} });
    this.dispatchEvent(deleteEvent);
    this.shadowRoot.querySelector('#container').classList.add('removed');
    // TODO: add listener to wait for CSS animation completion, rather than hardcode ms
    setTimeout(()=>{this.remove()}, 300);
  }


  
  // individual paint functions
  // checking for this.isConnected (i.e in DOM) in each, as these also get triggered for static elements
  // that use attributeChangedCallback to set the values before connectedComponents is called
  #paintWidth(){
    if(this.isConnected){
      this.shadowRoot.getElementById('container').style.width = this.width+'px';
      // img element is not present during initial paint
      if (this.shadowRoot.querySelector('img')){
        this.shadowRoot.querySelector('img').style.width = this.width+'px';
      }
    }
  }
  #paintHeight(){
    if(this.isConnected){
      this.shadowRoot.getElementById('container').style.height = this.height+'px';
      // img element is not present during initial paint
      if(this.shadowRoot.querySelector('img')){
        this.shadowRoot.querySelector('img').style.height = this.height+'px';
      }
    }
  }
  #paintSrc(){
    if(this.isConnected){
      let img = this.shadowRoot.querySelector('img');
      img.onload = function(){
        this.classList.add('ready');
      };
      // console.log(`need ${this.height * this.#dppx} px`)
      img.src = `https://picsum.photos/id/${this.photoid}/${Math.round(this.width)}/${Math.round(this.height)}`;
    } 
  }
  #paintRating(){
    if(this.isConnected){
      // setting the value thus will not fire sl-change event
      this.shadowRoot.querySelector('sl-rating').value = this.rating;
    }
  }
  #paintSelected(){
    if(this.inisConnected){
      this.shadowRoot.querySelector('input[type="checkbox"]').checked = this.selected;
    }
  }
  
  // boilerplate stuff
  get photoid(){
    return this.#photoid;
  }
  set photoid(_){
    this.#photoid = _;
    // nothing to paint
  }
  
  get width(){
    return this.#width;
  }
  set width(_){
    this.#width = +_;
    this.#paintWidth();
  }
  
  get height(){
    return this.#height;
  }
  set height(_){
    this.#height = +_;
    this.#paintHeight();
  }
  
  get rating(){
    return this.#rating;
  }
  set rating(_){
    this.#rating = _;
    this.#paintRating();
  }
  
  get selected(){
    return this.#selected;
  }
  set selected(_){
    this.#selected = _
    this.#paintSelected();
  }

}

customElements.define('g-thumb', GThumb);
