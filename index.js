"use strict;";
import {EditCell} from "./item.js";
import {AppDB} from "./appdb.js";
const overviewUI = document.getElementById("overview-main");
const overviewTable = document.getElementById("overview");
const blankSetup = document.getElementById("blank-setup");
const fAddItem = document.getElementById("add-item");
const addItem = document.getElementById("add-item-btn");
const saveDBToFileBtn = document.getElementById("export-data-btn");
const loadDBFromFileBtn = document.getElementById("import-data-btn");
const loadDBFromFileSetupBtn = document.getElementById("import-data-btn-setup");
export const itemDB = new AppDB();
new EditCell();
const EDIT_ITEM = "EDIT_ITEM";
const DELETE_ITEM = "DELETE_ITEM";
class App {
  constructor() {
    this.items = new Map();
  }
  enterInitialLoadState() {
    overviewTable.addEventListener("click", (event) => this.handleTableEventClick(event));
    overviewTable.addEventListener("saveedit", (event) => this.handleTableEventClick(event));
    itemDB.getAll().then((res) => {
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
    }).catch((loadDataFailReason) => {
      console.error("failed to load data", loadDataFailReason);
    });
  }
  addItem(item) {
    this.items.set(item.name, item);
  }
  async addItemSubmit(event) {
    const addData = event.formData;
    const name = addData.get("item-name");
    const sQty = addData.get("item-qty");
    const qty = parseInt(sQty, 10);
    const sThreshold = addData.get("item-threshold");
    const threshold = parseInt(sThreshold, 10);
    const url = addData.get("item-reorder-url");
    const item = {name, qty, threshold, url};
    await itemDB.update(item.name, item);
    this.items.set(item.name, item);
  }
  handleAddItemFormDataInNormal(e) {
    console.log("Normal item form submit");
    console.log(this);
    this.addItemSubmit(e).then((res) => {
      fAddItem.reset();
      fAddItem.classList.add("hide");
      this.refreshView();
    }).catch((err) => {
      console.error(`failed to add item to DB, ${e}`);
    });
  }
  refreshView() {
    let newTBody = document.createElement("tbody");
    overviewTable.tBodies[0].replaceWith(newTBody);
    if (this.items.size === 0) {
      this.transitionFromNormalToSetup();
    } else {
      this.populateInitialTable();
    }
  }
  handleAddItemFormData(e) {
    this.addItemSubmit(e).then((res) => {
      fAddItem.reset();
      console.log("before transition setup -> normal");
      console.log(this);
      this.transitionFromSetupToNormal();
    }).catch((e2) => {
      console.error(`failed to add 1st item to DB, ${e2}`);
    });
  }
  loadBlankState() {
    blankSetup.classList.remove("hide");
    loadDBFromFileSetupBtn.addEventListener("change", this.loadDataHandler.bind(this));
    fAddItem.classList.remove("hide");
    fAddItem.addEventListener("submit", (e) => {
      e.preventDefault();
      new FormData(fAddItem);
    }, {once: true});
    fAddItem.addEventListener("formdata", (e) => this.handleAddItemFormData(e), {once: true});
    blankSetup.appendChild(fAddItem);
    fAddItem.querySelector("#add-name").focus();
    console.log("show form");
  }
  transitionFromSetupToNormal() {
    console.log("entered transition Setup -> Normal fn");
    console.log(fAddItem);
    blankSetup.classList.add("hide");
    this.enterNormalState();
  }
  enterNormalState() {
    this.populateInitialTable();
    addItem.addEventListener("click", (e) => {
      fAddItem.classList.toggle("hide");
      overviewUI.insertBefore(fAddItem, overviewTable);
      fAddItem.querySelector("#add-name").focus();
      fAddItem.addEventListener("submit", (e2) => {
        e2.preventDefault();
        new FormData(fAddItem);
      }, {once: true});
      fAddItem.addEventListener("formdata", (event) => {
        this.handleAddItemFormDataInNormal(event);
      }, {once: true});
    });
    overviewUI.classList.remove("hide");
    loadDBFromFileBtn.addEventListener("change", this.loadDataHandler.bind(this));
    saveDBToFileBtn.addEventListener("click", () => this.exportDataToFile());
  }
  replaceAppData(newData) {
    this.items = newData;
    itemDB.clear().then((res) => {
      for (const item of this.items.values()) {
        itemDB.addItem(item);
      }
      console.log("DB updated with replacement file");
    });
  }
  importDataFromFile(e) {
    console.log("file import button changed normal mode");
    console.log(e);
    if (e.target.files.length === 0) {
      console.log("File selection cancelled");
      return;
    }
    let files = e.target.files;
    let file = files[0];
    let reader = new FileReader();
    reader.addEventListener("load", (e2) => {
      let parsedData = JSON.parse(e2.target.result);
      let newAppData = new Map([...parsedData]);
      this.replaceAppData(newAppData);
      this.refreshView();
    }, {once: true});
    reader.readAsText(file);
  }
  exportDataToFile() {
    console.log("export button pressed");
    let exportedData = JSON.stringify([...this.items], null, 2);
    let blob = new Blob([exportedData], {type: "application/json"});
    let url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "items.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  loadDataHandler(e) {
    this.importDataFromFile(e);
    e.currentTarget.removeEventListener("change", this.loadDataHandler);
    e.target.value = "";
    this.transitionFromSetupToNormal();
  }
  transitionFromNormalToSetup() {
    console.log("Normal -> Setup transition");
    overviewUI.classList.add("hide");
    blankSetup.classList.remove("hide");
    fAddItem.classList.remove("hide");
    blankSetup.appendChild(fAddItem);
    loadDBFromFileSetupBtn.addEventListener("change", this.loadDataHandler.bind(this));
    fAddItem.querySelector("#add-name").focus();
    fAddItem.addEventListener("submit", (e) => {
      e.preventDefault();
      new FormData(fAddItem);
    }, {once: true});
    fAddItem.addEventListener("formdata", (e) => {
      this.handleAddItemFormDataInNormal(e);
      overviewUI.classList.remove("hide");
      blankSetup.classList.add("hide");
      fAddItem.classList.remove("hide");
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
        console.error("Item removed from DB was not tracked in App internal items");
      }
      this.refreshView();
    }).catch((err) => {
      console.error(`failed to remove '${itemName} - ${err}`);
      throw err;
    });
  }
  handleEdit(e) {
    console.log("Got edit request for row");
    console.log(e);
    console.log(e.target);
    const itemName = e.target.dataset.name;
    let trToEdit = e.target.closest("tr");
    console.log("Table row to edit");
    console.log(trToEdit);
    this.switchToEditModeForRow(trToEdit, itemName);
  }
  switchToEditModeForRow(elemTRow, itemName) {
    let itemNameCell = elemTRow.cells[0];
    let itemQtyCell = elemTRow.cells[1];
    let itemThresholdCell = elemTRow.cells[2];
    let item = this.items.get(itemName);
    this.switchCellToEditMode(itemNameCell, "edit-cell-name-link-template", new Map(Object.entries({name: item.name, url: item.url})));
    this.switchCellToEditMode(itemQtyCell, "edit-cell-qty-template", new Map(Object.entries({qty: item.qty})));
    this.switchCellToEditMode(itemThresholdCell, "edit-cell-threshold-template", new Map(Object.entries({threshold: item.threshold})));
  }
  switchCellToEditMode(tCellElem, template, data) {
    let editCell = tCellElem.cloneNode(false);
    tCellElem.parentNode.replaceChild(editCell, tCellElem);
    let editCellTemplate = document.getElementById(template);
    let editCellTemplateContent = editCellTemplate.content.cloneNode(true);
    editCell.appendChild(editCellTemplateContent);
    let activeEditContentCell = editCell.querySelector("edit-cell");
    for (const [fieldName, value] of data.entries()) {
      activeEditContentCell.setAttribute(fieldName, value);
    }
  }
  handleTableEventClick(e) {
    console.log(e.type);
    console.log(e.target);
    console.log(e.target.dataset);
    if (e.type == "saveedit") {
      console.log("got save edit event to handle");
      console.log(e.detail);
      console.log(`closest tr: ${e.target.closest("tr")}`);
      console.log(`item orig name from tr: ${e.target.closest("tr").dataset.name}`);
      let origItemName = e.target.closest("tr").dataset.name;
      const origItem = this.items.get(origItemName);
      console.log(`Original Item: ${JSON.stringify(origItem)}`);
      console.log(e.detail.changes);
      let editedItem = {...origItem, ...e.detail.changes};
      console.log(`edited update item: ${JSON.stringify(editedItem)}`);
      this.items.set(editedItem.name, editedItem);
      itemDB.update(origItem.name, editedItem);
      if (editedItem.name !== origItem.name) {
        this.items.delete(origItemName);
      }
      this.refreshView();
    }
    switch (e.target.dataset.actionType) {
      case DELETE_ITEM:
        this.handleDelete(e);
        break;
      case EDIT_ITEM: {
        this.handleEdit(e);
        break;
      }
      case "save-item": {
        console.log("got save edit request");
        this.handeSaveEdit(e);
      }
    }
  }
  populateInitialTable() {
    let overviewTableBodyRef = overviewTable.getElementsByTagName("tbody")[0];
    for (const item of this.items.values()) {
      let newRow = overviewTableBodyRef.insertRow();
      newRow.setAttribute("data-name", item.name);
      let itemNameCell = newRow.insertCell();
      itemNameCell.addEventListener("click", this.handleRequestToEditCell);
      if (item.url === "") {
        itemNameCell.appendChild(document.createTextNode(item.name));
      } else {
        let itemNameLink = document.createElement("a");
        let reorderText = document.createTextNode(item.name);
        itemNameLink.appendChild(reorderText);
        itemNameLink.title = item.name;
        itemNameLink.href = item.url;
        itemNameLink.target = "_blank";
        itemNameLink.rel = "noreferrer noopener";
        itemNameCell.appendChild(itemNameLink);
      }
      let qtyCell = newRow.insertCell();
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
      btnEdit.setAttribute("data-action-type", EDIT_ITEM);
      btnEdit.setAttribute("data-name", item.name);
      let btnDelete = document.createElement("BUTTON");
      btnDelete.textContent = "Delete";
      btnDelete.setAttribute("data-action-type", DELETE_ITEM);
      btnDelete.setAttribute("data-name", item.name);
      actionCell.appendChild(btnDelete);
    }
  }
}
const app = new App();
app.enterInitialLoadState();
