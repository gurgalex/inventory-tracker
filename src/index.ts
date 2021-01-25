'use strict;'
import {EditCell, Item} from "/item";
import {AppDB} from "/db";

// Overview section
const overviewUI = document.getElementById('overview-main');

// Overview Table element
const overviewTable: HTMLTableElement = document.getElementById('overview');
// Setup UI
const blankSetup = document.getElementById('blank-setup');

// Add Item form element
const fAddItem = document.getElementById('add-item');
// Add Item form btn
const addItem = document.getElementById("add-item-btn");

export const itemDB = new AppDB();

// Why does making a new instance cause all of the Cells to work?
// Maybe because 1st instance in file?
new EditCell();

// Loading State

// Show Greeting + instructions
// Hide empty table
// Show add item form


// Switch to view state with data
// load initial data

const EDIT_ITEM = "EDIT_ITEM";
const DELETE_ITEM = "DELETE_ITEM";

class App {
    private items: Map<string, Item>;


    constructor() {
        this.items = new Map();
    }

    enterInitialLoadState() {
        // Todo: Bug - Figure out how to only add event listerns once regardless of which state Normal mode is entered from
        // Todo: - Continued - Maybe Templates of Overview to remove OverviewUI and resetup table?.
        // attach button presser for actions on table
        overviewTable.addEventListener('click', (event) => this.handleTableEventClick(event));
        overviewTable.addEventListener('saveedit', (event) => this.handleTableEventClick(event));

        itemDB.getAll().then(res => {
            if (res.length === 0) {
                console.log("No items added yet");
                this.loadBlankState();
            } else {
                for (const item of res) {
                    this.addItem(item);
                }
                console.log(this.items);
                this.transitionFromSetupToNormal();
            }
        }).catch(loadDataFailReason => {
            // Failure if
            console.error("failed to load data", loadDataFailReason);
        });
    }

    addItem(item: Item) {
        this.items.set(item.name, item);
    }


    async addItemSubmit(event) {
        const addData: FormData = event.formData;
        const name = addData.get("item-name");
        const sQty: string = addData.get("item-qty");
        const qty = parseInt(sQty, 10);

        const sThreshold = addData.get("item-threshold");
        const threshold = parseInt(sThreshold, 10);
        const url = addData.get("item-reorder-url")
        const item: Item = {name, qty, threshold, url};
        await itemDB.update(item.name, item);
        this.items.set(item.name, item);
    }


    handleAddItemFormDataInNormal(e) {
        console.log("Normal item form submit");
        console.log(this);
        this.addItemSubmit(e).then(res => {
            // Clear form
            fAddItem.reset();
            // hide the form
            fAddItem.classList.add('hide');
            // refresh Overview table contents
            this.refreshView();

        }).catch(err => {
            console.error(`failed to add item to DB, ${e}`);
        })
    }

    /**
     * Refresh the table of the overview UI
     */
    refreshView() {
        // prepare new table body
        let newTBody = document.createElement('tbody');
        overviewTable.tBodies[0].replaceWith(newTBody)

        if (this.items.size === 0) {
            this.transitionFromNormalToSetup();
        } else {
            this.populateInitialTable();
        }

    }

    handleAddItemFormData(e) {
        this.addItemSubmit(e).then(res => {
                // Clear form
                fAddItem.reset();
                // transition to Normal display of
                console.log('before transition setup -> normal');
                console.log(this);
                this.transitionFromSetupToNormal();
            }
        ).catch(e => {
            console.error(`failed to add 1st item to DB, ${e}`);
        });
    }


    // Transitions to and from states
    // States
    loadBlankState() {
        blankSetup.classList.remove('hide');
        // Make form visible
        fAddItem.classList.remove('hide');

        // Setup form submission handling
        fAddItem.addEventListener('submit', e => {
            e.preventDefault();
            new FormData(fAddItem);
        }, {once: true});

        fAddItem.addEventListener('formdata', (e) => this.handleAddItemFormData(e), {once: true});

        blankSetup.appendChild(fAddItem);
    }

    transitionFromSetupToNormal() {
        // hide add item form
        console.log('entered transition normal -> setup fn');
        console.log(fAddItem);
        blankSetup.classList.add('hide');

        this.enterNormalState();
    }

    enterNormalState() {

        this.populateInitialTable();
        addItem.addEventListener('click', e => {
            fAddItem.classList.toggle('hide');
            overviewUI.insertBefore(fAddItem, overviewTable);
            // read event listener
            fAddItem.addEventListener('submit', e => {
                e.preventDefault();
                new FormData(fAddItem);
            }, {once: true});
            fAddItem.addEventListener('formdata', event => {
                this.handleAddItemFormDataInNormal(event);
            }, {once: true});
        })

        // show overview table
        overviewUI.classList.remove('hide');
    }

    transitionFromNormalToSetup() {
        console.log("Normal -> Setup transition");
        // Hide table since 0 items
        overviewUI.classList.add('hide');

        // Show setup screen again
        blankSetup.classList.remove('hide');
        fAddItem.classList.remove('hide');
        blankSetup.appendChild(fAddItem);
        // Setup form submission handling
        fAddItem.addEventListener('submit', e => {
            e.preventDefault();
            new FormData(fAddItem);
        }, {once: true});

        fAddItem.addEventListener('formdata', (e) => {
            this.handleAddItemFormDataInNormal(e);
            overviewUI.classList.remove('hide');

            blankSetup.classList.add('hide');
            fAddItem.classList.remove('hide');
            //blankSetup.appendChild(fAddItem);
        }, {once: true});
    }

    handleDelete(e) {
        console.log("Delete item request got");
        const itemName = e.target.dataset.name;
        itemDB.remove(e.target.dataset.name).then(() => {
            console.debug(`Successfully removed item - ${itemName} from IndexedDB`);
            if (this.items.delete(itemName)) {
                console.debug(`Removed '${itemName}' from internal app data`);
            }
            else {
                console.error('Item removed from DB was not tracked in App internal items');
            }
            this.refreshView();
        })
            .catch(err => {
                console.error(`failed to remove '${itemName} - ${err}`);
                throw err;
            });

    }

    handleEdit(e) {
        console.log("Got edit request for row");
        console.log(e);
        console.log(e.target);
        const itemName = e.target.dataset.name;
        let trToEdit = e.target.closest('tr');
        console.log("Table row to edit");
        console.log(trToEdit);
        this.switchToEditModeForRow(trToEdit, itemName);

    }

    /**
     *
     * @param elemTRow The table row to switch to edit mode
     */
    switchToEditModeForRow(elemTRow: HTMLTableRowElement, itemName: string) {
        let itemNameCell = elemTRow.cells[0];
        let itemQtyCell = elemTRow.cells[1];
        let itemThresholdCell = elemTRow.cells[2];

        let item = this.items.get(itemName);

        // Replace with edit cell
        let editItemNameCell = itemNameCell.cloneNode(false);
        itemNameCell.parentNode.replaceChild(editItemNameCell, itemNameCell);


        let editItemCellTemplate = document.getElementById('edit-cell-name-link-template');
        let editItemCellContent = editItemCellTemplate.content.cloneNode(true);
        editItemNameCell.appendChild(editItemCellContent);

        // Once appended, the current reference to the template content is invalid.
        // Get a new reference
        let activeEditItemNameContentCell = editItemNameCell.querySelector('edit-cell');
        activeEditItemNameContentCell.setAttribute('name', item.name);
        activeEditItemNameContentCell.setAttribute('url', item.url);

        // qty cell edit - create edit cell
        let editQtyCell = itemQtyCell.cloneNode(false);
        itemQtyCell.parentNode.replaceChild(editQtyCell, itemQtyCell);
        let editQtyTemplate = document.getElementById('edit-cell-qty-template');
        let editQtyContent = editQtyTemplate.content.cloneNode(true);
        editQtyCell.appendChild(editQtyContent);

        // Once appended, the current reference to the template content is invalid.
        // Get a new reference
        let activeEditQtyCell = editQtyCell.querySelector('edit-cell');
        activeEditQtyCell.setAttribute('qty', item.qty);

        // Create edit threshold cell
        let editThresholdCell = itemThresholdCell.cloneNode(false);
        itemThresholdCell.parentNode.replaceChild(editThresholdCell, itemThresholdCell);
        let editThresholdTemplate = document.getElementById('edit-cell-threshold-template');
        let editThresholdContent = editThresholdTemplate.content.cloneNode(true);
        editThresholdCell.appendChild(editThresholdContent);

        // Once appended, the current reference to the template content is invalid.
        // Get a new reference
        let activeEditThresholdCell = editThresholdCell.querySelector('edit-cell');
        activeEditThresholdCell.setAttribute('threshold', item.threshold);

    }

    handleEvent(ev) {
        console.log(ev);
    }


    handleTableEventClick(e) {
        console.log(e.type);
        console.log(e.target);
        // Which actionType to perform?
        // switch dataset?
        console.log(e.target.dataset);

        if (e.type == 'saveedit') {
            console.log("got save edit event to handle");
            console.log(e.detail);
            console.log(`closest tr: ${e.target.closest("tr")}`);
            console.log(`item orig name from tr: ${e.target.closest("tr").dataset.name}`);
            let origItemName = e.target.closest("tr").dataset.name;

            // Get original contents
            const origItem = this.items.get(origItemName);
            console.log(`Original Item: ${JSON.stringify(origItem)}`);

            // Merge changes
            console.log(e.detail.changes);
            let editedItem = {...origItem, ...e.detail.changes};
            console.log(`edited update item: ${JSON.stringify(editedItem)}`);
            this.items.set(editedItem.name, editedItem);
            itemDB.update(origItem.name, editedItem);

            // Need to remove the old item name if it changed. Replace with edited name
            if (editedItem.name !== origItem.name) {
                this.items.delete(origItemName);
            }
            this.refreshView();
        }


        switch (e.target.dataset.actionType) {
            case DELETE_ITEM:
                this.handleDelete(e)
                break;
            case EDIT_ITEM: {
                this.handleEdit(e);
                break;
            }
            case 'save-item': {
                console.log("got save edit request");
                this.handeSaveEdit(e);
            }
        }
    }

    populateInitialTable() {
        // table body
        let overviewTableBodyRef = overviewTable.getElementsByTagName('tbody')[0];
        // Populate table based on data we read from databasefadd
        for (const item of this.items.values()) {
            // name, qty, threshold, url, actions
            let newRow: HTMLTableRowElement = overviewTableBodyRef.insertRow();
            // Have each row say which item name it has info on
            newRow.setAttribute('data-name', item.name);
            let itemNameCell = newRow.insertCell();
            itemNameCell.addEventListener('click', this.handleRequestToEditCell);
            if (item.url === '') {
                itemNameCell.appendChild(document.createTextNode(item.name));
            }
            else {
                let itemNameLink = document.createElement('a');
                let reorderText = document.createTextNode(item.name);
                itemNameLink.appendChild(reorderText);
                itemNameLink.title = item.name;
                itemNameLink.href = item.url;
                itemNameLink.target = "_blank";
                itemNameLink.rel = "noreferrer noopener";
                itemNameCell.appendChild(itemNameLink);

            }


            let qtyCell = newRow.insertCell();
            // Style if below desired threshold
            if (item.qty < item.threshold) {
                qtyCell.classList.add("low");
            }
            qtyCell.appendChild(document.createTextNode(item.qty.toString()));

            let thresholdCell = newRow.insertCell();
            thresholdCell.appendChild(document.createTextNode(item.threshold.toString()));

            let actionCell = newRow.insertCell();
            let btnEdit = document.createElement("BUTTON");
            btnEdit.textContent = "Edit";
            actionCell.appendChild(btnEdit);
            btnEdit.setAttribute('data-action-type', EDIT_ITEM);
            btnEdit.setAttribute('data-name', item.name);

            let btnDelete = document.createElement("BUTTON");
            btnDelete.textContent = 'Delete';

            // Say which action the button will perform for event handling
            btnDelete.setAttribute('data-action-type', DELETE_ITEM);
            // Fast way to delete row without querying row in table for item name
            btnDelete.setAttribute('data-name', item.name);
            actionCell.appendChild(btnDelete);
        }
    }

}

const app = new App();
app.enterInitialLoadState();
