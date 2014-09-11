Ext.define('Rally.technicalservices.TreePicker', {
    extend: 'Ext.form.field.Picker',
    tree_panel: null,
    createPicker: function() {
        console.log(this.tree_panel);
        return this.tree_panel;  
    }
    


});