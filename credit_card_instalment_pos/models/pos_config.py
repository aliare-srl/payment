# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class PosConfig(models.Model):
    _inherit = 'pos.config'

    saleme_discount = fields.Boolean(
        string="Saleme Discount"
    )
    saleme_discount_pc = fields.Float(
        string='Discount Percentage Saleme',
        help='The default discount percentage',
        default=5.0
    )
    saleme_discount_product_id = fields.Many2one(
        'product.product',
        string='Discount Product Saleme',
        domain="[('sale_ok', '=', True)]",
        help='The product used to model the discount.'
    )
    saleme_cash_id = fields.Many2one(
        'pos.payment.method',
        string='Cash Saleme',
        domain="[('is_cash_count', '=', True)]",
    )

