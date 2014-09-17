/*
 * A series of utilities to help construct trees
 * with data gotten bottom or middle-up
 * 
 */
 
Ext.define('Rally.technicalservices.util.TreeBuilding', {
    singleton: true,
    logger: new Rally.technicalservices.Logger(),
    /*
     * Given a hash of models (key = object id) that all know what
     * their parent is (based on the "parent" field -- note lowercase)
     * Return an array of models that are at the root level and
     * have a "children" field (note lowercase)
     * with appropriate items in an array 
     */
    constructRootItems:function(item_hash) {
        var root_array = [];
        Ext.Object.each(item_hash, function(oid,item){
            if ( !item.get('children') ) { item.set('children',[]); }
            var direct_parent = item.get('parent');
            if (!direct_parent && !Ext.Array.contains(root_array,item)) {
                root_array.push(item);
            } else {
                
                var parent_oid =  direct_parent.ObjectID || direct_parent.get('ObjectID');
                if (!item_hash[parent_oid]) {
                    this.logger.log("Saved parent missing: ", parent_oid);
                    if ( !Ext.Array.contains(root_array,item) ) {
                        root_array.push(item);
                    }
                } else {
                    var parent = item_hash[parent_oid];
                    if ( !parent.get('children') ) { parent.set('children',[]); }
                    var kids = parent.get('children');
                    kids.push(item);
                    parent.set('children',kids);
                }
            }
        },this);
        return root_array;
    },
    /**
     * Given an array of models, turn them into hashes
     */
    convertModelsToHashes: function(model_array) {
        var hash_array = [];
        Ext.Array.each(model_array,function(model){
            if (this.isModel(model)) {
                var model_as_hash = model.getData();
                model_as_hash.expanded = false;
                model_as_hash.leaf = false;
                
                // children & parent are fields that are not a 
                // part of the model def'n so getData doesn't provide them
                if ( model.get('children') ) {
                    model_as_hash.children = this.convertModelsToHashes(model.get('children'));
                }
                if ( model.get('parent') ) {
                    if ( this.isModel(model.get('parent') ) ) {
                        model_as_hash.parent = model.get('parent').getData();
                    } else {
                        model_as_hash.parent = model.get('parent');
                    }
                }

                if (!model_as_hash.children || model_as_hash.children.length === 0 ) {
                    model_as_hash.leaf = true;
                }
                
                hash_array.push(model_as_hash);
            } else {
                hash_array.push(model);
            }
        },this);
        return hash_array;
    },
    isModel: function(model){
        return model && ( model instanceof Ext.data.Model );
    },
    /*
     * given an array of models, convert them into hashes only using select fields from the model
     * 
     */
    convertModelsToHashesLimitFields: function(models, fields){
        var hash_array = [];
        Ext.Array.each(models,function(model){
            if (this.isModel(model)) {
                var model_as_hash = this._transformModelToHash(model, fields);
                // children & parent are fields that are not a 
                // part of the model def'n so getData doesn't provide them
                if (model.get('ObjectID')){
                    model_as_hash.id = model.get('ObjectID');
                }
                if ( model.get('children') ) {
                    model_as_hash.children = this.convertModelsToHashesLimitFields(model.get('children'),fields);
                }
                if ( model.get('parent') ) {
                    if ( this.isModel(model.get('parent') ) ) {
                        model_as_hash.parent = this._transformModelToHash(model.get('parent'), fields); 
                    } else {
                        model_as_hash.parent = model.get('parent');
                    }
                }

                if (!model_as_hash.children || model_as_hash.children.length === 0 ) {
                    model_as_hash.leaf = true;
                }
                
                hash_array.push(model_as_hash);
            } else {
                hash_array.push(model);
            }
        },this);
        return hash_array;
    },
    _transformModelToHash: function(model, fields){
        var model_as_hash = {};
        model_as_hash.expanded = false;
        model_as_hash.leaf = false;
        Ext.each(fields, function(field){
            model_as_hash[field] = model.get(field);
        });
        return model_as_hash; 
    }
});