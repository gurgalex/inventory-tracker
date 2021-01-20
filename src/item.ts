import {itemDB} from '/index';

export class ItemRow extends HTMLTableRowElement {

    // The Item
    item: Item;

    // Event to notify when the item requests removal
    onItemRemoveClick: CustomEvent = new CustomEvent('itemRemove', {
        bubbles: true,
        cancelable: false,
        composed: true,
    });

    onCellClick: CustomEvent = new CustomEvent('itemEdit', {
        bubbles: false,
        cancelable: false,
        composed: false,
    });


    static get observedAttributes() {
        return ['name', 'qty', 'threshold', 'url'];
    }

    // Getter and setters for attributes and property
    set name(val: string) {
        this.item.name = val;
        if (val.trim() === '')
            this.removeAttribute('name');
        else {
            this.setAttribute('name', val);
        }
    }

    get qty() {
        return this.item.qty;
    }

    // Setter for Attributes
    set qty(val: number) {
        this.item.qty = val;
        this.setAttribute('qty', val.toString());
    }

    get threshold() {
        return this.item.threshold;
    }

    set threshold(val: number) {
        this.item.threshold = val;
        this.setAttribute('threshold', val.toString());
    }

    get url(): string {
        return this.item.url;
    }

    set url(val: string) {
        this.item.url = val;
        this.setAttribute('url', val);
    }

    constructor() {
        super();

        // Setup custom event: Item Remove
        //this.handleRequesttoEditCell = this.handleRequesttoEditCell.bind(this);

        const name = this.getAttribute('name') || '';
        // Custom name: Get working set properties complex

        const tQty = parseInt(this.getAttribute('qty') ?? '');
        const qty = Number.isInteger(tQty) ? tQty : 0;

        const tThreshold = parseInt(this.getAttribute('threshold') ?? '');
        const threshold = Number.isInteger(tThreshold) ? tThreshold : 0;

        const url = this.getAttribute('url') || '';

        this.item = {
            name,
            qty,
            threshold,
            url,
        };


    }



    connectedCallback() {
        // Events can be added now
        // TOdo: state machine for edit management
        // https://krasimirtsonev.com/blog/article/managing-state-in-javascript-with-state-machines-stent
        this.addEventListener('transitionItemEdit', e => {
            // Todo: Update Database and Item struct
            const cell = event.detail.cell;
            let value = e.target.textContent;
            e.target.textContent = '';
            let input = document.createElement('input');
            input.value = value;
            input.addEventListener('change', (e) => {
                let changeTo = e.target.value

                let evt = new CustomEvent('itemEdit', {detail: {itemName: this.item.name, cellWhichChanged: cell, changeTo}, bubbles: true});
                //this.item[cell] = changedContent;
                e.target.dispatchEvent(evt);
            });
            e.target.appendChild(input);
        })
        console.log("custom table row element connected");


            this.render()

        }

        handleRequesttoEditCell = (event) => {
        console.log(event);
            event.target.removeEventListener('click', this.handleRequesttoEditCell);
            let editEvent = new CustomEvent('transitionItemEdit', {
                bubbles: true,
                detail: {cell: 'name'}});
            event.target.dispatchEvent(editEvent);

        }

        render() {
            let itemNameCell = this.insertCell();
            itemNameCell.addEventListener('click', this.handleRequesttoEditCell);

            itemNameCell.appendChild(document.createTextNode(this.item.name));

            let qtyCell = this.insertCell();
            // Style if below desired threshold
            if (this.item.qty < this.item.threshold) {
                qtyCell.classList.add("low");
            }
            qtyCell.appendChild(document.createTextNode(this.item.qty.toString()));

            let thresholdCell = this.insertCell();
            thresholdCell.appendChild(document.createTextNode(this.item.threshold.toString()));

            let restockUrlCell = this.insertCell();
            if (this.url === '') {
                document.createTextNode('No resupply');
            }
            else {

                let reorderLink = document.createElement('a');
                const titleText = `Reorder`;
                let reorderText = document.createTextNode(titleText);
                reorderLink.appendChild(reorderText);
                reorderLink.title = titleText;
                reorderLink.href = this.item.url;
                reorderLink.target = "_blank";
                reorderLink.rel = "noreferrer noopener";
                restockUrlCell.appendChild(reorderLink);
            }


            // Add click event listener to every data cell
            //document.querySelectorAll("#overview td")
            //    .forEach(e => e.addEventListener("click", clickHandlerCellTable));

            let actionCell = this.insertCell();
            //actionCell.addEventListener("click", clickHandleBtnItemDelete);
            let btnDelete = document.createElement("BUTTON");
            btnDelete.textContent = 'Delete';
            btnDelete.addEventListener('click', (e) => {
               this.dispatchEvent(this.onItemRemoveClick);
            });


            actionCell.appendChild(btnDelete);

        }
}

customElements.define('item-row', ItemRow, {extends: 'tr'});
//customElements.define('item-row', ItemRow);


// Need to make our own table element, since <table> can't have custom elements inside.
export class ItemTable extends HTMLTableElement {
    // Map of <ItemName, Item>
    private items: Map<string, Item> = new Map();
    // Map of Child Components
    private childRefs: Map<string, ItemRow> = new Map();

    constructor() {
        super();
    }

    addItem(item: Item) {
        // Learned: tagName is native element we extend.  `is` is the custom element to route to.
        let newRow: ItemRow = document.createElement('tr', {is: 'item-row'});
        newRow.name = item.name;
        newRow.qty = item.qty;
        newRow.threshold = item.threshold;
        newRow.url = item.url;

        // Setup delete event handler. Parent remove row
        newRow.addEventListener('itemRemove', (e) => {
            console.log("got request to remove item");
            console.log(e);
        })

        newRow.addEventListener('itemEdit', e => {
            console.log(`Edit Item. ${JSON.stringify(e.detail)}`)
            let newItem = this.items.get(e.detail.itemName);
            let oldKey = e.detail.itemName;
            newItem[e.detail.cellWhichChanged] = e.detail.changeTo;
          itemDB.update(oldKey, newItem);

          // Drop and replace key if Item name was changed
            if (e.detail.cellWhichChanged === 'name') {
                this.items.delete(oldKey);
                this.items.set(newItem.name, newItem);
            }
            //Todo: Remove input element.
            //Todo: Rerender with updated content
            
        })

        this.items.set(item.name, item);
        this.childRefs.set(item.name, newRow);
        // Todo: Seperate adding item from rendering the display
        this.appendChild(newRow);
    }

    connectedCallback() {
        console.log("custom table element connected");
    }
}

customElements.define('item-table', ItemTable, {extends: 'table'});


export class Item {
    // The name of the Item
    name: string;
    // How many of the item we have
    qty: number;
    // How many we want to have at minimum
    threshold: number;
    // Where the item can be reordered
    url: string;

    constructor(name: string, qty: number, threshold: number, url: string) {
        this.name = name;
        this.qty = qty;
        this.threshold = threshold;
        this.url = url;
    }
}
