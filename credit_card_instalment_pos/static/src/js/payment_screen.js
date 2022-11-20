odoo.define("pos_card_instalment.payment_screen", function(require){
    console.log('pos_card_instalment.payment_screen');

	const PaymentScreen = require('point_of_sale.PaymentScreen');
	const Registries = require('point_of_sale.Registries');
	const { useListener } = require('web.custom_hooks');

    const PosPaymentScreenCard = (PaymentScreen) =>
		class extends PaymentScreen {
			constructor() {
				super(...arguments);
				useListener('payment-card', this.paymentCard);
				let self = this;
			}

			paymentCard(event) {
				let self = this;

				let selected = $(".instalment").val()
				console.log('val...', selected)

				this.showPopup('PaymentCardsPopupWidget', {
					body: 'Payment Method Card',
					startingValue: self,
					obj: self,
					selected: selected,
                    title: this.env._t('Payment Method Card'),
                });
			}
		};
	Registries.Component.extend(PaymentScreen, PosPaymentScreenCard);
	return PosPaymentScreenCard;
})