class R3Album extends HTMLElement {
  
  #width; #paint_layout = false; #gutterspace = 4; #data; #album_name; #album_name_height = 50; #album_height; 
  
  static get observedAttributes() {
    return ['paint_layout','album_name','width','gutterspace','data','data_src'];
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
    
    // paint album name
    this.#paintName();
    
    // calculate album layout
    this.#doLayout();

    // paint album only if paint_layout is set
    if(this.#paint_layout){
      this.#paintLayout();
    } else {
      // painting of layout will selectively happen from the wrapper, so not doing anything here
    }

    this.shadowRoot.getElementById('container')
      .addEventListener('r3-item-deleted', this.#handleItemDeleted, true)
    ;

    this.shadowRoot.getElementById('container')
      .addEventListener('r3-select-all-clicked', this.#handleSelectAll, true)
    ;

    this.shadowRoot.getElementById('container')
      .addEventListener('r3-item-selected', this.#handleItemSelected, true);
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case 'paint_layout':
        this.paint_layout = newValue == null ? false : true;
        break;
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
    this.shadowRoot.getElementById('container')
    .removeEventListener('r3-item-deleted', this.#handleItemDeleted)
    ;
  }

  #handleSelectAll = (evt)=>{
    // console.log('select all clicked');
    let selected = evt.detail.select;
    this.data.forEach(item=>{
      if(item.elem){
        if(item.elem.selected == selected){
          // item is already in the target state, nothing to do
        } else {
          item.elem.selected = selected;
        }
      } else {
        // the item is not in DOM yet, save the state in layout
        item.layout.selected = selected;
      }
    });
  }

  #handleItemSelected = (evt)=>{
    // none to select-some / select-all (or a single album item)
    // select-some to select-all / none
    // select-all to select-some / none (for a single album item)

    // get distinct values of array found at https://stackoverflow.com/a/14438954/8098748
    let albumItemsDistinctSelected = [... new Set( this.data.map(item=>item.elem ? item.elem.selected : item.layout.selected ? item.layout.selected : false) )];

    let r3AlbumName = this.shadowRoot.querySelector('r3-album-name');
    
    if(albumItemsDistinctSelected.length > 1){
      r3AlbumName.albumSelectedValue = 'some';
    } else {
      if (albumItemsDistinctSelected[0] == true){
        r3AlbumName.albumSelectedValue = 'all';
      } else {
        r3AlbumName.albumSelectedValue = 'none';
      }
    }

  }

  #handleItemDeleted = (evt)=>{
    let deletedItem = evt.target;
    this.#deleteItem(deletedItem, true);
    
  }
  
  #deleteItem(item, doLayoutChanges=false){
    // if an item from this album is deleted, 
    // 1. remove references to the item,
    // 2. recompute album layout, 
    // 3. and if height has changed, dispatch an event
    
    item.style.transform += " scale(0)";
    // TODO: add listener to wait for CSS animation completion, rather than hardcode ms
    setTimeout(()=>{
      // remove the item from DOM (with a transition)
      item.remove();
  
      // remove element from the list
      let removedElementIndex = this.data.findIndex((x)=>x.layout.id==item.id)
      this.data.splice(removedElementIndex, 1);
      
      if(doLayoutChanges){
        this.#performLayoutChangesIfNeeded();
      }
    }, 100);
    
  }

  #performLayoutChangesIfNeeded(){
    let lastAlbumHeight = this.album_height;
    // re-calc layout
    this.#doLayout();

    // paint album only if paint_layout is set
    if(this.#paint_layout){
      this.#paintLayout();
    } else {
      // painting of layout will selectively happen from the wrapper, so not doing anything here
    }

    // if there is any height change resulting from this delete, fire an event, so 
    // the wrapper r3-gallery can paint as needed
    if(lastAlbumHeight != this.album_height){
      let albumHeightChangeEvent = new Event('r3-album-height-changed', {composed: true, bubbles: true});
      this.dispatchEvent(albumHeightChangeEvent);
    }
  }

  deleteSelectedItems(){
    // since we remove the items of the array, the index of the array changes
    // hence read them backwards :-)
    // https://stackoverflow.com/a/9882349/8098748
    
    let i = this.data.length;
    while(i--){
      if(this.data[i].elem && this.data[i].elem.selected){
        this.#deleteItem(this.data[i].elem, false);
      }
    };

    setTimeout(()=>this.#performLayoutChangesIfNeeded(), 100)
  }
  
  #getMinAspectRatio(){
    if (this.width <= 640) {
      return 2;
    } else if (this.width <= 1280) {
      return 4;
    } else if (this.width <= 1920) {
      return 5;
    }
    return 6;
  }
  
  #doLayout(){
    // console.log('in #doLayout');
    // console.log('width: '+this.clientWidth)
    // console.log('width: '+this.#width)
    let minAspectRatio = this.#getMinAspectRatio(), row = [], rowAspectRatio = 0, 
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
            id: r.data.id,
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

  redoLayout = this.#doLayout;
  
  selectivelyPaintLayout(bufferTop, bufferBottom, albumTop){
    // console.log('in selectivelyPaintLayout')

    this.data.forEach(x=>{

      let thumbTop = albumTop + x.layout.offsetHeight, thumbBottom = thumbTop + x.height;
      
      // add/remove/leave as is from DOM as appropriate
      if ((thumbTop    >= bufferTop && thumbTop    <= bufferBottom) ||
          (thumbBottom >= bufferTop && thumbBottom <= bufferBottom))
      {
        // album is within the boundaries
        this.#paintItem(x);
      } else {
        // item is not within boundaries

        // remove the item from DOM if present
        if(x.elem !== undefined){
          // remove element in shadow dom
          x.elem.remove();
        }
      }
      
    })
  }

  #paintLayout(){
    this.data.forEach(x=>{
      this.#paintItem(x);
    });
  }

  #paintItem(x){
    if(x.elem == undefined){
      // create element in dom
      let elem = Object.assign(document.createElement('r3-thumb'), {
        id: x.data.id,
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
  }

  #paintName(){
    let a = document.createElement('r3-album-name');
    a.albumName = this.album_name;
    a.style.height = this.album_name_height + 'px';

    this.shadowRoot.getElementById('container').appendChild(a);
  }

  // boilerplate
  get paint_layout(){
    return this.#paint_layout;
  }
  set paint_layout(_){
    this.#paint_layout = _;
  }

  get album_name(){
    return this.#album_name;
  }
  set album_name(_){
    this.#album_name = _;
  }
  
  get width(){
    return this.#width;
  }
  set width(_){
    this.#width = +_;
  }

  get gutterspace(){
    return this.#gutterspace;
  }
  set gutterspace(_){
    this.#gutterspace = +_;
  }

  get data(){
    return this.#data;
  }
  set data(_){
    // create a placeholder for the element
    // this will be further updated with the layout and actual element reference
    this.#data = _.map(x=>{
      return {
        data : { ...x }
      }
    });
  }

  get album_name_height(){
    return this.#album_name_height;
  }
  set album_name_height(_){
    this.#album_name_height = +_;
  }

  get album_height(){
    return this.#album_height;
  }
  set album_height(_){
    this.#album_height = +_;
  }
  
}

customElements.define('r3-album', R3Album);

