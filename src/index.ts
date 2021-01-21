'use strict;'
import {ItemTable} from '/item';
import {AppDB} from "/db";
import {Item} from "src/item";

// Overview section
const overviewUI = document.getElementById('overview-main');

// Overview Table element
const overviewTable: HTMLTableElement = document.getElementById('overview');
// Setup UI
const blankSetup = document.getElementById('blank-setup');

// Add Item form element
const fAddItem = document.getElementById('add-item');

export const itemDB = new AppDB();


// Loading State

// Show Greeting + instructions
// Hide empty table
// Show add item form


// Switch to view state with data
// load initial data


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
        const addItem = document.getElementById("add-item-btn");
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


    handleTableEventClick(e) {
        console.log("table clicked:");
        console.log(e);
        console.log(e.target);
        const target = e.target;
        // Which actionType to perform?
        // switch dataset?
        console.log(e.target.dataset);
        console.log(e.target.dataset.actionType);

        switch (e.target.dataset.actionType) {
            case 'deleteItem':
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
                break;
        }
    }

    populateInitialTable() {
        // table body
        let overviewTableBodyRef = overviewTable.getElementsByTagName('tbody')[0];
        // Populate table based on data we read from databasefadd
        for (const item of this.items.values()) {
            // name, qty, threshold, url, actions
            let newRow: HTMLTableRowElement = overviewTableBodyRef.insertRow();
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
            let btnDelete = document.createElement("BUTTON");
            btnDelete.textContent = 'Delete';

            // Say which action the button will perform for event handling
            btnDelete.setAttribute('data-action-type', 'deleteItem');
            // Fast way to delete row without querying row in table for item name
            btnDelete.setAttribute('data-name', item.name);
            actionCell.appendChild(btnDelete);
        }
    }

}

const app = new App();
app.enterInitialLoadState();
