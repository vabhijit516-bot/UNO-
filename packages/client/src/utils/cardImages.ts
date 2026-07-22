import { Card } from '@uno/shared';

export function getCardImageUrl(card: Card): string {
    if (card.type === 'wild') return '/img/cards/wild-wild.png';
    if (card.type === 'wildDrawFour') return '/img/cards/draw4-wild.png';

    let colorChar = 'R';
    if (card.color === 'blue') colorChar = 'B';
    else if (card.color === 'green') colorChar = 'G';
    else if (card.color === 'yellow') colorChar = 'Y';
    else if (card.color === 'red') colorChar = 'R';

    if (card.type === 'number') {
        return `/img/cards/${card.value}-${colorChar}.png`;
    }
    
    if (card.type === 'skip') {
        return `/img/cards/skip-${colorChar}.png`;
    }

    if (card.type === 'reverse') {
        return `/img/cards/reverse-${colorChar}.png`;
    }

    if (card.type === 'drawTwo') {
        return `/img/cards/draw2-${colorChar}.png`;
    }

    return '/img/cards/back.png';
}
