export class saveEdit extends Event {
    constructor(itemChanges) {
        super('saveedit', {
            bubbles: true,
            composed: true,
        });
        this.itemChanges = itemChanges;
    }
}


export class EditCell extends HTMLElement {
    static get observedAttributes() {return ['name', 'url', 'qty', 'threshold'];}

    constructor() {
        super()
        const shadow = this.attachShadow({mode: 'open'});
        let template = document.getElementById('edit-cell-template')
        let TInstance = template.content.cloneNode(true);
        shadow.appendChild(TInstance);
    }


    get saveBtn() {
        return this.shadowRoot.querySelector('.save-edit-btn');
    }

    handleEvent(ev) {
        console.log(ev.type);

        // Save request button was pressed
        if (ev.target.classList.contains('save-edit-btn')) {

            let changes = {};
            let editedFields = HTMLInputElement = this.querySelectorAll(`[data-field]`);
            for (const editedField of editedFields) {
                changes[editedField.dataset.field] = editedField.value;
            }


            let eventEdit = new CustomEvent('saveedit',
                {bubbles: true, composed: true,
                    detail: {changes: changes},
                });
            ev.target.dispatchEvent(eventEdit);
            console.log(`dispatched event ${eventEdit}`);
            return;
        }
        else if (ev.target.classList.contains('cancel-edit-btn')) {
            console.log("cancel btn pressed");
        }
        else {
            switch (ev.type) {
                case 'keydown':
                    console.log('keydown event for edit field');
                    console.log(ev);
                    switch (ev.key) {
                        case 'Escape':
                            console.log("Cancel input, revert to normal mode");
                            break;
                        case 'Enter':
                            console.log(`url valid?: ${ev.target.checkValidity()}`);
                            if (ev.target.checkValidity()) {
                                console.log("Confirmed input, fire item change");
                                console.log(ev.target.value);
                            } else {
                                console.log("invalid URL supplied");
                            }
                    }

                    break;
            }
        }
    }

    connectedCallback() {
        console.log('Custom generic EditCell element added to page');
        this.saveBtn.addEventListener('click', this);
    }

    disconnectedCallback() {
        console.log('Custom generic EditCell element removed from page');
    }


    attributeChangedCallback(attrName, oldValue, newValue) {
        let changedField = HTMLInputElement = this.querySelector(`[data-field="${attrName}"]`);
        changedField.value = newValue;
    }
}

customElements.define('edit-cell', EditCell);

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
