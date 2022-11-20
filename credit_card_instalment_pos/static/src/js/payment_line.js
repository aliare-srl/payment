odoo.define("pos_card_instalment.payment_line", function(require){
    console.log('pos_card_instalment.payment_line');
    var models = require("point_of_sale.models");


    var _super_Paymentline = models.Paymentline.prototype;
    models.Paymentline = models.Paymentline.extend({
        init_from_JSON: function(json) {
            _super_Paymentline.init_from_JSON.apply(this,arguments);
            this.card_id = false;
            this.instalment_id = false;
            this.card_type = false;
            this.card_number = false;
            this.tiket_number = false;
            this.lot_number = false;
            this.fee = false;
        },
        export_as_JSON: function() {
            let json_extend = _super_Paymentline.export_as_JSON.apply(this);
            json_extend['instalment_id'] = this.instalment_id;
            json_extend['card_number'] = this.card_number;
            json_extend['tiket_number'] = this.tiket_number;
            json_extend['lot_number'] = this.lot_number;
            json_extend['fee'] = this.fee;
            return json_extend;
        },
    })

})