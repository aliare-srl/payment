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
            console.log('is_cash_count', line['payment_method']['is_cash_count']);
            console.log('type', line['payment_method']['type']);
            if (line['payment_method']['type']=='cash') {
                this.getValuePopup();
            }
        }

        async getValuePopup() {
            console.log('getValuePopup')
            let self = this;
            let myformData = {};
            let form = $(".checkout_form");

            console.log('form', form)

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

            console.log('amountCof------', amountCof)

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

            let tax = this.env.pos.taxes_by_id[product.taxes_id[0]];
            console.log('tax', tax)
            if (tax['price_include'] == false) {
                let calc_tax = (tax['amount']/100)+1;
                fee = fee/(calc_tax);
                fee = Math.round(fee * 100) / 100
                console.log('calc_tax', calc_tax)
                console.log('new fee', fee)
            }
            // if (fee != 0) {
            //     order.add_product(product, {extras:{name: 'Cargo Tarjeta'},
            //                                         price: fee,
            //                                         quantity: 1,
            //                                         merge: false
            //                                         });
            // }
            // line.set_amount(amountCof) ;

            // line.set_payment_status('done');
            // // this.render_paymentlines();
            // // order.finalized = true; //TODO: Es la única forma que encontre de que no te deje borrar los productos.
            // this.trigger('close-popup');
            if (line['payment_method']['type']=='cash' && this.env.pos.config.saleme_discount) {
                // alert('ok')
                console.log('amountCof......----', amountCof)

                var pc = this.env.pos.config.saleme_discount_pc;
                console.log('pc', pc)
                const { confirmed, payload } = await this.showPopup('NumberPopup', {
                    title: this.env._t('Ingrese el monto en efectivo. ('+pc+'% de descuento.)'),
                    body: this.env._t('This click is successfully done.'),
                    startingValue: parseFloat(amountCof),
                });
                if (confirmed) {
                    console.log('payload', payload);
                    var val = parseFloat(payload);
                    var total = this.env.pos.get_order().get_total_with_tax();
                    var acum = this.env.pos.get_order().get_acum_no_cash();
                    // var due = parseFloat(this.env.pos.get_order().get_due());
                    console.log('val', val)
                    // console.log('due', due)
                    console.log('total', total)
                    console.log('acum', acum)

                    var due = total - acum;
                    console.log('due', due)

                    if (val > due && due != 0) {
                        val = due;
                    }
                    console.log('val', val)


                    await self.apply_discount(val);
                    console.log('fee------', fee)

                    if (fee != 0) {
                        order.add_product(product, {extras:{name: 'Cargo Tarjeta'},
                                                            price: fee,
                                                            quantity: 1,
                                                            merge: false,
                                                            });
                    }
                    line.set_amount(parseFloat(payload)) ;

                    line.set_payment_status('done');
                    // this.render_paymentlines();
                    // order.finalized = true; //TODO: Es la única forma que encontre de que no te deje borrar los productos.
                    // this.trigger('close-popup');
                }
            } else {
                if (fee != 0) {
                    order.add_product(product, {extras:{name: 'Cargo Tarjeta'},
                                                        price: fee,
                                                        quantity: 1,
                                                        merge: false,
                                                        });
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
            var product  = this.env.pos.db.get_product_by_id(this.env.pos.config.saleme_discount_product_id[0]);
            if (product === undefined) {
                await this.showPopup('ErrorPopup', {
                    title : this.env._t("No discount product found"),
                    body  : this.env._t("The discount product seems misconfigured. Make sure it is flagged as 'Can be Sold' and 'Available in Point of Sale'."),
                });
                return;
            }

            // Remove existing discounts
            for (const line of lines) {
                if (line.get_product() === product) {
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

            if( discount < 0 ){
                order.add_product(product, {
                    price: discount,
                    lst_price: discount,
                    extras: {
                        price_manually_set: true,
                    },
                });
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