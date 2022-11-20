odoo.define("pos_card_instalment.payment_card_popup", function(require){
    console.log('pos_card_instalment.payment_card_popup');

    var core = require('web.core');
	const { useState, useRef } = owl.hooks;
	const { useListener } = require('web.custom_hooks');
	const PosComponent = require('point_of_sale.PosComponent');
	const Registries = require('point_of_sale.Registries');
	const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
	var QWeb = core.qweb;
	var models = require('point_of_sale.models');

	var _t = core._t;

    class PaymentCardsPopupWidget extends AbstractAwaitablePopup {
        constructor() {
			super(...arguments);
		}

		mounted() {
            console.log('this.props.selected', this.props.selected)
            let selected = this.props.selected;
            let order = this.env.pos.get_order();
            let paymentline = order.selected_paymentline
    		let line = order.get_paymentline(paymentline.cid);
            let self = this;

            if (line) {
                var amount = line.get_amount();
                let instalments = line.payment_method.instalments;

                console.log('instalments', instalments)
                console.log('selected', selected)
                for (var i = 0; i < instalments.length; i++) {
                    var instal = instalments[i]
                    console.log('instal', instal)
                    let amountCof = amount * instal['coefficient'];
                    let fee = amountCof - amount;
                    $("#selectPopupInstalments").append('<option value="' +
                        instal['id'] + '" coef="' + fee + '" amount="' + amountCof + '">' + instal['name'] + '</option>');
                }

                if (selected) {
                    $('#selectPopupInstalments').val(selected);
                } else {
                    $('#selectPopupInstalments').val(1);
                }

                var amount = $('#selectPopupInstalments option:selected').attr('amount');
                $('#amount').empty().text(amount);
            }

        }

        getValue() {
            console.log('getValue')
            let self = this;
            let myformData = {};
            let form = $(".checkout_form");

            console.log('form', form)

            let order = this.env.pos.get_order();
            let paymentline = order.selected_paymentline;
    		let line = order.get_paymentline(paymentline.cid);

            console.log('order.get_paymentlines.........', order.get_paymentlines)

            if ($(form)[0].checkValidity() === false) {
                $('.message-error').removeClass('hidden');
            } else {
                let fd = new FormData(form[0]);
                for (var pair of fd.entries()) {
                    myformData[pair[0]] = pair[1];
                }

                let payment_method = line.payment_method;
                let fee = $('#selectPopupInstalments option:selected').attr('coef');
                let amountCof = $('#selectPopupInstalments option:selected').attr('amount');

                let instalment_id = $('#selectPopupInstalments option:selected').val();

                line['instalment_id'] = parseInt(instalment_id);
                line['card_number'] = $('#cc-number').val();
                line['tiket_number'] = $('#ticket-number').val();
                line['lot_number'] = $('#lot-number').val();
                line['fee'] = fee;

                let product_id = parseInt(payment_method.instalment_product_id[0]);
                console.log('product_id', product_id)
                console.log('product_id', self.env.pos.db.get_product_by_id(product_id))
                console.log('this', this.env.pos.db)
                let product = self.env.pos.db.get_product_by_id(product_id);
                order.add_product(product, {extras:{name: 'Cargo Tarjeta'}, price:fee,quantity:1, merge: false});
                line.set_amount(amountCof) ;

                line.set_payment_status('done');
                // this.render_paymentlines();
                // order.finalized = true; //TODO: Es la única forma que encontre de que no te deje borrar los productos.
                this.trigger('close-popup');
            }
        }

        cancel() {
			this.trigger('close-popup');
        }

    }
    PaymentCardsPopupWidget.template = 'PaymentCardsPopupWidget';
	PaymentCardsPopupWidget.defaultProps = {
        confirmText: 'Ok',
        cancelText: 'Cancel',
        title: '',
        body: '',
        list: [],
        startingValue: '',
    };

	Registries.Component.add(PaymentCardsPopupWidget);

	return PaymentCardsPopupWidget;

})