import { animate, stagger } from 'animejs';

/**
 * Triggers 3D initial card deal animation for player hands
 */
export function animateDealCards(selector: string, delayBase = 0) {
    try {
        animate(selector, {
            translateY: [150, 0],
            translateZ: [200, 0],
            rotateX: [45, 0],
            rotateY: [180, 0],
            scale: [0.3, 1],
            opacity: [0, 1],
            delay: stagger(65, { start: delayBase }),
            duration: 750,
            ease: 'outBack'
        });
    } catch (e) {
        console.warn('Anime.js 3D animation fallback:', e);
    }
}

/**
 * Triggers 3D landing shockwave ripple effect on discard pile
 */
export function animateLandingShockwave(rippleEl: HTMLElement) {
    if (!rippleEl) return;

    try {
        animate(rippleEl, {
            scale: [0.5, 2.2],
            rotateZ: [0, 45],
            opacity: [0.9, 0],
            duration: 650,
            ease: 'outExpo'
        });
    } catch (e) {
        console.warn('Anime.js shockwave fallback:', e);
    }
}

/**
 * Triggers 3D draw card animation from draw pile to hand
 */
export function animateDrawCard3D(drawPileEl: HTMLElement, handEl: HTMLElement) {
    if (!drawPileEl || !handEl) return;

    const drawRect = drawPileEl.getBoundingClientRect();
    const handRect = handEl.getBoundingClientRect();

    const deltaX = handRect.left + handRect.width / 2 - (drawRect.left + drawRect.width / 2);
    const deltaY = handRect.top + handRect.height / 2 - (drawRect.top + drawRect.height / 2);

    const clone = drawPileEl.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = `${drawRect.left}px`;
    clone.style.top = `${drawRect.top}px`;
    clone.style.width = `${drawRect.width}px`;
    clone.style.height = `${drawRect.height}px`;
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);

    try {
        animate(clone, {
            translateX: [0, deltaX],
            translateY: [0, deltaY],
            rotateY: [0, 180],
            rotateZ: [0, -10],
            scale: [1, 0.8],
            duration: 500,
            ease: 'outCubic',
            onComplete: () => {
                clone.remove();
            }
        });
    } catch (e) {
        clone.remove();
    }
}
