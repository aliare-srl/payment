# -*- coding: utf-8 -*-
{
    "name": "Implent in pos credit card instalment",
    "summary": "",
    "description": """
    """,
    "author": "Filoquin, Ing. Gabriela Rivero",
    "website": "http://www.sipecu.com.ar",
    "category": "pos",
    "version": "13.0.0.1",
    "depends": ["credit_card_instalment", "point_of_sale"],
    "data": [
        # 'security/ir.model.access.csv',
        "views/pos_payment_method.xml",
        "views/pos_make_payment.xml",
        "views/pos_payment.xml",
    ],
    'assets': {
        "point_of_sale.assets": [
            "/credit_card_instalment_pos/static/src/css/card_instalment.css",
            "/credit_card_instalment_pos/static/src/js/models.js",
            "/credit_card_instalment_pos/static/src/js/payment_line.js",
            "/credit_card_instalment_pos/static/src/js/payment_card_popup.js",
            "/credit_card_instalment_pos/static/src/js/payment_screen.js",
        ],
        'web.assets_qweb': [
             'credit_card_instalment_pos/static/src/xml/card_instalment.xml',
        ],

    },
}
