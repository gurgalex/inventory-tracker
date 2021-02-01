'use strict;'
import {EditCell, Item} from "/item.js";
import {AppDB} from "/appdb.js";

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

// save DB to file button
const saveDBToFileBtn = document.getElementById('export-data-btn');
// import DB from saved file
const loadDBFromFileBtn = document.getElementById('import-data-btn');
// setup screen - Load data from file button
const loadDBFromFileSetupBtn = document.getElementById('import-data-btn-setup');

export const itemDB = new AppDB();

// Why does making a new instance cause all of the Cells to work?
// Maybe because 1st instance in file?
new EditCell();


const EDIT_ITEM = "EDIT_ITEM";
const DELETE_ITEM = "DELETE_ITEM";

const CANCEL_EDIT = 'cancel-edit';

class App {
    private items: Map<string, Item>;


    constructor() {
        this.items = new Map();
    }

    enterInitialLoadState() {
        overviewTable.addEventListener('click', (event) => this.handleTableEventClick(event));
        overviewTable.addEventListener('save-edit', this);
        overviewTable.addEventListener('cancel-edit', this);


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
     * Refresh the UI of the whole app based off number of items tracked
     */
    refreshView() {
        // prepare new table body
        let newTBody = document.createElement('tbody');
        overviewTable.tBodies[0].replaceWith(newTBody)

        const zeroItems = this.items.size === 0;
        if (zeroItems) {
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

    loadBlankState() {
        // Make Setup screen visible
        blankSetup.classList.remove('hide');

        // Setup the load existing data button
        loadDBFromFileSetupBtn.addEventListener('change', this.loadDataHandler.bind(this));

        // Make form visible
        fAddItem.classList.remove('hide');

        // Setup form submission handling
        fAddItem.addEventListener('submit', e => {
            e.preventDefault();
            new FormData(fAddItem);
        }, {once: true});

        fAddItem.addEventListener('formdata', (e) => this.handleAddItemFormData(e), {once: true});

        blankSetup.appendChild(fAddItem);
        // focus the 1st field of the form
        fAddItem.querySelector('#add-name').focus();
        console.log("show form");
    }

    transitionFromSetupToNormal() {
        // hide add item form
        console.log('entered transition Setup -> Normal fn');
        console.log(fAddItem);
        blankSetup.classList.add('hide');

        this.enterNormalState();
    }

    enterNormalState() {
        this.populateInitialTable();
        addItem.addEventListener('click', e => {
            fAddItem.classList.toggle('hide');
            overviewUI.insertBefore(fAddItem, overviewTable);
            // focus the name
            fAddItem.querySelector("#add-name").focus();

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

        loadDBFromFileBtn.addEventListener('change', this.loadDataHandler.bind(this));


        // add event listener for export button
        saveDBToFileBtn.addEventListener('click', () => this.exportDataToFile());
    }

    replaceAppData(newData: Map<string, string>) {
        // replace database contents
        this.items = newData;
        itemDB.clear().then(res => {
            for (const item of this.items.values()) {
                itemDB.addItem(item);
            }
            console.log("DB updated with replacement file");
        });

    }

    importDataFromFile(e) {
        console.log("file import button changed normal mode");
        console.log(e)

        // input element has files selected
        if (e.target.files.length === 0) {
            console.log("File selection cancelled");
            return;
        }
        let files: FileList = e.target.files;
        let file = files[0];
        let reader = new FileReader();
        reader.addEventListener('load', e => {
            // read the file data
            let parsedData = JSON.parse(e.target.result);
            // create map and replace items
            let newAppData = new Map([...parsedData]);

            this.replaceAppData(newAppData);
            this.refreshView();
        }, {once: true});
        reader.readAsText(file);

    }

    exportDataToFile() {
        console.log("export button pressed");
        let exportedData = JSON.stringify([...this.items], null, 2);

        // Need data to be a sequence [] + a blob
        let blob = new Blob([exportedData], {type: "application/json"});

        // Adapted from LogRocket blog post for downloading blobs
        // link: https://blog.logrocket.com/programmatic-file-downloads-in-the-browser-9a5186298d5c/

        // Further adaptation - getting download to work without click handler
        // link: https://yon.fun/download-file-js/

        // Create an object URL for the blob object
        let url = URL.createObjectURL(blob);

        // Create a new anchor element to later click and store the download link
        const link = document.createElement('a');

        // Set the href and download attributes for the anchor element
        // You can optionally set other attributes like `title`, etc
        // Especially, if the anchor element will be attached to the DOM
        link.href = url;
        link.download = "items.json";

        // Programmatically trigger a click on the anchor element
        // Useful if you want the download to happen automatically
        // Without attaching the anchor element to the DOM
        link.click();

        // Free the url resource (and blob memory?)
        URL.revokeObjectURL(url);
        // -- end adaptation
    }

    loadDataHandler(e) {
        this.importDataFromFile(e);
        e.currentTarget.removeEventListener('change', this.loadDataHandler);
        // reset file handler for importing more files of same name
        e.target.value = '';
        this.transitionFromSetupToNormal();
    }

    transitionFromNormalToSetup() {
        console.log("Normal -> Setup transition");
        // Hide table since 0 items
        overviewUI.classList.add('hide');

        // Show setup screen again
        blankSetup.classList.remove('hide');
        fAddItem.classList.remove('hide');
        blankSetup.appendChild(fAddItem);

        // show load data button
        loadDBFromFileSetupBtn.addEventListener('change', this.loadDataHandler.bind(this));

        // focus form name
        fAddItem.querySelector('#add-name').focus();

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
        }, {once: true});
    }

    handleDelete(e) {
        console.log("Delete item request got");
        const itemName = e.target.dataset.name;
        itemDB.remove(e.target.dataset.name).then(() => {
            console.debug(`Successfully removed item - ${itemName} from IndexedDB`);
            if (this.items.delete(itemName)) {
                console.debug(`Removed '${itemName}' from internal app data`);
            } else {
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
     * @param itemName Item name used to identify the row
     */
    switchToEditModeForRow(elemTRow: HTMLTableRowElement, itemName: string) {
        let itemNameCell = elemTRow.cells[0];
        let itemQtyCell = elemTRow.cells[1];
        let itemThresholdCell = elemTRow.cells[2];

        let item = this.items.get(itemName);

        this.switchCellToEditMode(itemNameCell,
            'edit-cell-name-link-template',
            new Map(Object.entries({name: item.name, url: item.url})));


        // qty cell edit - create edit cell
        this.switchCellToEditMode(itemQtyCell,
            'edit-cell-qty-template',
            new Map(Object.entries({qty: item.qty})));


        this.switchCellToEditMode(itemThresholdCell,
            'edit-cell-threshold-template',
            new Map(Object.entries({threshold: item.threshold})));
    }

    /**
     * @param tCellElem the table cell element ref to switch into editing mode
     * @param template HTML document id of the template for the edit cell
     * @param data Object Where key = field editing, and value = value of current field

     **/
    switchCellToEditMode(tCellElem: HTMLTableCellElement, template: string, data: Map<string, any>) {
        // Replace with edit cell
        let editCell = tCellElem.cloneNode(false);
        tCellElem.parentNode.replaceChild(editCell, tCellElem);


        let editCellTemplate = document.getElementById(template);
        let editCellTemplateContent = editCellTemplate.content.cloneNode(true);
        editCell.appendChild(editCellTemplateContent);

        // Once appended, the current reference to the template content is invalid.
        // Get a new reference
        let activeEditContentCell = editCell.querySelector('edit-cell');
        for (const [fieldName, value] of data.entries()) {
            activeEditContentCell.setAttribute(fieldName, value);
        }

        //

    }

    handleSaveEdit(e) {
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

    handleEvent(e) {
        console.log("got event type");
        console.log(e.type)
        if (e.type == 'save-edit') {
            this.handleSaveEdit(e);
        }
        else if (e.type == 'cancel-edit') {
            console.log("handling cancel edit request event");
            this.refreshView();
        }
    }

    handleTableEventClick(e) {
        console.log("table click event got")
        console.log(`event type: ${e.type}`);
        console.log("event target:");
        console.log(e.target);

        switch (e.target.dataset.actionType) {
            case DELETE_ITEM:
                this.handleDelete(e)
                break;
            case EDIT_ITEM: {
                this.handleEdit(e);
                break;
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
            } else {
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
