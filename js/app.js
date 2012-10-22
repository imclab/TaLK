define('js/app',[
    'jquery',
    'underscore',
    'handlebars',
    'couchr',
    'garden-app-support'
],
function($, _, handlebars, couchr, garden, greeting_t, list_t){
    var exports = {};

    /**
     * This is where you will put things you can do before the dom is loaded.
     */
    exports.init = function() {
    }

    /**
     * This that occur after the dom has loaded.
     */
    exports.on_dom_ready = function(){
        garden.get_garden_ctx(function(err, garden_ctx){

        })

        couchr.get('_db/_all_docs', function (err, resp) {

        });

    }


    return exports;
});