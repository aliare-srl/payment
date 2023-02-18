odoo.define("pos_card_instalment.payment_card_popup", function(require){

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
            let selected = this.props.selected;
            let order = this.env.pos.get_order();
            let paymentline = order.selected_paymentline
    		let line = order.get_paymentline(paymentline.cid);
            let self = this;


            if (line) {
                var amount = line.get_amount();
                let instalments = line.payment_method.instalments;

                for (var i = 0; i < instalments.length; i++) {
                    var instal = instalments[i]
                    let amountCof = amount * instal['coefficient'];
                    amountCof = Math.round(amountCof * 100) / 100;
                    let fee = amountCof - amount;
                    fee = Math.round(fee * 100) / 100;

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
            // if line  = cash entonces llamo a getValue
            // y refactorizar getValue
            // is_cash_count == true or type="cash"
            if (line['payment_method']['type']=='cash') {
                this.getValuePopup();
            }
        }

        async getValuePopup() {
            let self = this;
            let myformData = {};
            let form = $(".checkout_form");

            let order = this.env.pos.get_order();
            let paymentline = order.selected_paymentline;
    		let line = order.get_paymentline(paymentline.cid);

            let fd = new FormData(form[0]);
            for (var pair of fd.entries()) {
                myformData[pair[0]] = pair[1];
            }

            let payment_method = line.payment_method;
            let fee = $('#selectPopupInstalments option:selected').attr('coef');
            let amountCof = $('#selectPopupInstalments option:selected').attr('amount');

            let instalment_id = $('#selectPopupInstalments option:selected').val();

            let amount_to_pay = Math.round(parseFloat(amountCof) * 100) / 100
            console.log('amount_to_pay .......', amount_to_pay)

            if (line['payment_method']['type']=='cash' && this.env.pos.config.saleme_discount) {

                var pc = this.env.pos.config.saleme_discount_pc;
                const { confirmed, payload } = await this.showPopup('NumberPopup', {
                    title: this.env._t('Ingrese el monto en efectivo. ('+pc+'% de descuento.)'),
                    body: this.env._t('This click is successfully done.'),
                    startingValue: amount_to_pay,
                });
                if (confirmed) {
                    console.log('payload', payload)
                    let paid_amount = parseFloat(payload.replace(',', '.'))
                    var val = paid_amount;
                    var total = this.env.pos.get_order().get_total_with_tax();
                    var acum = this.env.pos.get_order().get_acum_no_cash();

                    var due = total - acum;

                    if (val > due && due != 0) {
                        val = due;
                    }

                    await self.apply_discount(val);
                    line.set_amount(paid_amount) ;
                    line.set_payment_status('done');
                }
            } else {
                line['instalment_id'] = parseInt(instalment_id);
                line['card_number'] = $('#cc-number').val();
                line['tiket_number'] = $('#ticket-number').val();
                line['lot_number'] = $('#lot-number').val();
                line['fee'] = fee;

                console.log('line fee', line['fee'])

                let instalment_product_id = parseInt(payment_method.instalment_product_id[0]);
                let instalment_product = self.env.pos.db.get_product_by_id(instalment_product_id);

                let tax = this.env.pos.taxes_by_id[instalment_product.taxes_id[0]];
                let pre_fee = fee;
                let fee_diff = 0;
                if (tax['price_include'] == false) {
                    let calc_tax = (tax['amount']/100)+1;
                    fee = fee/(calc_tax);
                    fee = Math.round(fee * 100) / 100

                    let fee_tax = fee * calc_tax;
                    fee_tax = Math.round(fee_tax * 100) / 100
                    console.log('\n\n\npre_fee-------', pre_fee)
                    console.log('fee_tax', fee_tax)
                    let pre_fee_diff = pre_fee - fee_tax

                    fee_diff = Math.round(pre_fee_diff * 100 ) / 100
                }
                console.log('fee------', fee)
                if (fee != 0) {
                    let line_cargo_tarjeta = {
                        price: fee,
                        lst_price: fee,
                        quantity: 1,
                        merge: false,
                        extras:{ price_manually_set: true },
                    }

                    console.log('line_cargo_tarjeta', line_cargo_tarjeta)
                    order.add_product(instalment_product, line_cargo_tarjeta);

                    console.log('fee_diff', fee_diff)

                    if (fee_diff != 0) {
                        let line_round_card = {
                            // price: Math.abs(fee_diff),
                            // lst_price: Math.abs(fee_diff),
                            price: fee_diff,
                            lst_price: fee_diff,
                            quantity: 1,
                            merge: false,
                            extras:{ price_manually_set: true },
                        }
                        console.log('line_round_card', line_round_card)
                        order.add_product(instalment_product, line_round_card);
                    }


                }
                line.set_amount(amountCof) ;



                line.set_payment_status('done');
                // this.render_paymentlines();
                // order.finalized = true; //TODO: Es la única forma que encontre de que no te deje borrar los productos.
                this.trigger('close-popup');

            }
        }

        async apply_discount(base_to_discount) {
            var order    = this.env.pos.get_order();
            var lines    = order.get_orderlines();
            var product_discount  = this.env.pos.db.get_product_by_id(this.env.pos.config.saleme_discount_product_id[0]);
            var product_round  = this.env.pos.db.get_product_by_id(this.env.pos.config.saleme_round_product_id[0]);
            if (product_discount === undefined) {
                await this.showPopup('ErrorPopup', {
                    title : this.env._t("No discount product found"),
                    body  : this.env._t("The discount product seems misconfigured. Make sure it is flagged as 'Can be Sold' and 'Available in Point of Sale'."),
                });
                return;
            }
            if (product_round === undefined) {
                await this.showPopup('ErrorPopup', {
                    title : this.env._t("No Round product found"),
                    body  : this.env._t("The Round product seems misconfigured. Make sure it is flagged as 'Can be Sold' and 'Available in Point of Sale'."),
                });
                return;
            }

            // Remove existing discounts
            for (const line of lines) {
                if (line.get_product() === product_discount) {
                    order.remove_orderline(line);
                }
            }

            // Add discount
            // We add the price as manually set to avoid recomputation when changing customer.

            // var base_to_discount = order.get_total_without_tax();
            // if (product.taxes_id.length){
            //     var first_tax = this.env.pos.taxes_by_id[product.taxes_id[0]];
            //     if (first_tax.price_include) {
            //         base_to_discount = order.get_total_with_tax();
            //     }
            // }

            var pc = this.env.pos.config.saleme_discount_pc;

            var discount = - pc / 100.0 * base_to_discount;
            let pre_discount = discount;
            let diff = 0;
            var tax = this.env.pos.taxes_by_id[product_discount['taxes_id'][0]];
            if (tax['price_include'] == false) {
                let calc_tax = (tax['amount']/100)+1;
                discount = discount/(calc_tax);
                discount = Math.round(discount * 100) / 100

                let discount_tax = discount * calc_tax;
                discount_tax = Math.round(discount_tax * 100) / 100
                console.log('discount_tax', discount_tax)
                console.log('pre_discount', pre_discount)
                let pre_diff = pre_discount - discount_tax
                console.log('pre_diff', pre_diff)

                diff = Math.round(pre_diff * 100 ) / 100
                console.log('diff', diff)
            }
            if( discount < 0 ){
                let line_product_discount = {
                    price: discount,
                    lst_price: discount,
                    quantity: 1,
                    merge: false,
                    extras: { price_manually_set: true },
                }

                console.log('line_product_discount', line_product_discount)
                order.add_product(product_discount, line_product_discount);

                // if (diff != 0) {
                //     let line_round_product = {
                //         price: Math.abs(diff),
                //         lst_price: Math.abs(diff),
                //         quantity: 1,
                //         merge: false,
                //         extras: { price_manually_set: true },
                //     }
                //     console.log('line_round_product', line_round_product)
                //     order.add_product(product_round, line_round_product);
                // }
            }

        }

        getValue() {
            let self = this;
            let myformData = {};
            let form = $(".checkout_form");

            let order = this.env.pos.get_order();
            let paymentline = order.selected_paymentline;
    		let line = order.get_paymentline(paymentline.cid);

            if ($(form)[0].checkValidity() === false) {
                $('.message-error').removeClass('hidden');
            } else {
                this.getValuePopup();
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