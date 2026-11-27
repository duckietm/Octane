// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Offer } from './Offer';
import { Product } from './Product';
import { ProductTypeEnum } from './ProductTypeEnum';

const product = (type: string, classId: number, extraParam: string) => new Product(type, classId, extraParam, 1, null, null);

const offer = (products: Product[]) => new Offer(1, 'chat_bubble_40', false, 5, 0, 0, false, 0, products, false);

describe('Offer chat style products (AIR 13 PRODUCT_TYPE_CHAT_STYLE)', () => {
    it('sells a chat style alone as a single product', () => {
        const chatStyle = offer([product('CHAT_STYLE', 40, '40')]);

        expect(chatStyle.isChatStyleOffer).toBe(true);
        expect(chatStyle.pricingModel).toBe(Offer.PRICING_MODEL_SINGLE);
        expect(chatStyle.product.productType).toBe(ProductTypeEnum.CHAT_STYLE);
        expect(chatStyle.chatStyleId).toBeNull();
    });

    it('sells a chat style with a badge as the chat style, with the badge as add-on', () => {
        const bundle = offer([product(ProductTypeEnum.BADGE, 0, 'ACH_1'), product(ProductTypeEnum.CHAT_STYLE, 40, '40')]);

        expect(bundle.isChatStyleOffer).toBe(true);
        expect(bundle.pricingModel).toBe(Offer.PRICING_MODEL_SINGLE);
        expect(bundle.product.extraParam).toBe('40');
        expect(bundle.badgeCode).toBe('ACH_1');
    });

    it('shows a chat style that comes with furniture as an add-on', () => {
        const withFurni = offer([product(ProductTypeEnum.FLOOR, 13, ''), product(ProductTypeEnum.CHAT_STYLE, 40, '40')]);

        expect(withFurni.isChatStyleOffer).toBe(false);
        expect(withFurni.pricingModel).toBe(Offer.PRICING_MODEL_SINGLE);
        expect(withFurni.product.productType).toBe(ProductTypeEnum.FLOOR);
        expect(withFurni.chatStyleId).toBe('40');
    });
});
