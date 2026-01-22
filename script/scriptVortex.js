
// C’est la section verticale qui sert de zone de déclenchement du scroll
const wrapper = document.getElementById('scroll-wrapper');
const content = document.getElementById('horizontal-content'); // le contenu que l’on va faire défiler horizontalement

// Le code à l’intérieur s’exécute à chaque scroll de l’utilisateur
window.addEventListener('scroll', () => {
    // Calcul de la position du scroll par rapport au wrapper
    const offsetTop = wrapper.offsetTop; // Position verticale en pixels
    const scrollTop = window.scrollY; // Nombre de pixels déjà scrollés depuis le haut de la page.

    // On calcule combien de pixels on a scrollé à l'intérieur de la section
    let percentage = (scrollTop - offsetTop) / (wrapper.offsetHeight - window.innerHeight);

    // On limite entre 0 et 1 pour ne pas aovir de résulat négatifs (evite les bugs)
    percentage = Math.max(0, Math.min(1, percentage));

    // On déplace le contenu vers la gauche
    // Le calcul : (largeur totale du contenu - largeur de l'écran)
    const scrollAmount = content.offsetWidth - window.innerWidth;
    content.style.transform = `translateX(${-percentage * scrollAmount}px)`;
});


// variables globales
let bIdx = 0;
let rIdx = 0;
let modeIdx = 0;
let allGames = [];

// Sélection du tooltip
const tooltip = document.getElementById('tooltip');

// 1. Chargement des données
fetch('data/vgsales.json')
    .then(res => res.json())
    .then(data => {
        allGames = data;
        // Stocke toutes les données dans allGames.
        console.log("Données prêtes !");
    });

// Fonction utilitaire pour configurer le tooltip sur un élément
function setupTooltip(element, title, description) {
    if (!element) return; // Sécurité : si l’élément n’existe pas, on stoppe la fonction.

    // Quand la souris entre sur l’élément, on rend le tooltip visible
    element.onmouseenter = () => {
        tooltip.style.display = "block";
        tooltip.style.opacity = "1";
    };

    // À chaque mouvement de souris sur l’élément, on fais apparaitre le contenu du tooltip
    element.onmousemove = (e) => {
        tooltip.innerHTML = `<strong style="color:#ffa500">${title}</strong><br><span style="font-size:12px">${description}</span>`;
        tooltip.style.left = (e.pageX + 20) + "px";
        tooltip.style.top = (e.pageY - 20) + "px";
    };

    // Quand la souris quitte l’élément, on cache le tooltip
    element.onmouseleave = () => {
        tooltip.style.display = "none";
        tooltip.style.opacity = "0";
    };
}

// Calcule les statistiques d’un genre donné
function getGenreStats(targetGenre) {
    if (allGames.length === 0) return { hp: 0, sales: 0, count: 0 };


    // Filtre les jeux appartenant au genre demandé
    const genreGames = allGames.filter(g => g.Genre && g.Genre.toLowerCase() === targetGenre.toLowerCase());
    if (genreGames.length === 0) return { hp: 0, sales: 0, count: 0 };

    // Vie (HP) : Popularité du genre (Nombre de jeux sortis)
    let hp = (genreGames.length / allGames.length) * 50 * 8;
    if (hp > 100) hp = 100;

    // Laser : (Moyenne des ventes par jeu)
    const avgSales = genreGames.reduce((sum, g) => sum + parseFloat(g.Global_Sales || 0), 0) / genreGames.length;
    return { hp: hp, sales: avgSales, count: genreGames.length };
}

// Met à jour tout l’affichage du combat entre deux genres
function updateBattle(genre1, genre2) {
    // Récupère les stats des deux combattants
    const p1 = getGenreStats(genre1);
    const p2 = getGenreStats(genre2);

    // --- JOUEUR 1 ---
    const name1 = genre1.toUpperCase();
    document.getElementById('name1').innerText = name1;

    // Barre de Vie 1
    const bar1 = document.getElementById('hp1');
    bar1.style.width = p1.hp + "%";
    // Tooltip explicatif sur la barre de vie
    setupTooltip(bar1, "Points de Vie (HP)", `Représente la <strong>quantité</strong> de jeux : ${p1.count} jeux sortis.`);

    // Laser 1 (sa longueur alias sa puissance)
    const laser1 = document.getElementById('l1');
    laser1.style.width = (p1.sales * 200) + "px";
    setupTooltip(laser1, "Puissance Laser", `Moyenne des ventes : <strong>${p1.sales.toFixed(2)}M</strong> par jeu.`);

    // Personnage 1 (Taille)
    const char1 = document.querySelector('#f1 .character-svg');
    let scale1 = 0.6 + (p1.hp / 100);
    // Taille du personnage dépend de sa domination
    char1.style.transform = `scale(${scale1})`;
    setupTooltip(char1, `Combattant ${name1}`, `La taille dépend du volume total de jeux (${p1.hp.toFixed(0)}% de domination).`);

    // --- JOUEUR 2 ---
    const name2 = genre2.toUpperCase();
    document.getElementById('name2').innerText = name2;

    // Barre de Vie 2
    const bar2 = document.getElementById('hp2');
    bar2.style.width = p2.hp + "%";
    setupTooltip(bar2, "Points de Vie (HP)", `Représente la <strong>quantité</strong> de jeux : ${p2.count} jeux sortis.`);

    // Laser 2
    const laser2 = document.getElementById('l2');
    laser2.style.width = (p2.sales * 200) + "px";
    setupTooltip(laser2, "Puissance Laser", `Moyenne des ventes : <strong>${p2.sales.toFixed(2)}M</strong> par jeu.`);

    // Personnage 2 (Taille)
    const char2 = document.querySelector('#f2 .character-svg');
    let scale2 = 0.6 + (p2.hp / 100);
    char2.style.transform = `scale(${scale2})`;
    setupTooltip(char2, `Combattant ${name2}`, `La taille dépend du volume total de jeux (${p2.hp.toFixed(0)}% de domination).`);

    // Gestion des cris (shout)
    const s1 = document.getElementById('shout1');
    const s2 = document.getElementById('shout2');
    s1.classList.remove('active-shout');
    s2.classList.remove('active-shout');
    void s1.offsetWidth; void s2.offsetWidth;

    // Le perdant crie
    if (p1.hp < p2.hp) s1.classList.add('active-shout');
    else if (p2.hp < p1.hp) s2.classList.add('active-shout');
}

// Boutonsde combats - Chaque bouton déclenche un duel précis entre genres
function pressButtonA() { updateBattle('Action', 'Adventure'); }
function pressButtonB() { updateBattle('Racing', 'Platform'); }
function pressButtonC() { updateBattle('Strategy', 'Role-Playing'); }
function pressButtonD() { updateBattle('Sports', 'Simulation'); }

// Fonctions visuelles annexes
function moveMouse(d) {
    const wrap = document.getElementById('mouse-wrap');
    wrap.style.transform = d === 'left' ? 'translateX(-475px)' : 'translateX(0)';
}

// Change une variable CSS pour le néon
function cycleBlueIntensity() {
    const colors = ['#b3f7ff', '#00f2ff', '#004455'];
    document.getElementById('screen').style.setProperty('--neon-color', colors[bIdx]);
    bIdx = (bIdx + 1) % 3;
}

// Change le mode visuel global (N&B, sepia, etc.)
function switchVisualMode() {
    const arena = document.querySelector('.arena');
    const filters = ['none', 'grayscale(100%) brightness(1.2)', 'sepia(90%) saturate(300%)'];
    modeIdx = (modeIdx + 1) % filters.length;
    if (arena) arena.style.filter = filters[modeIdx];
}

// Ajoute un glow rouge au texte VS
function cycleRed() {
    const reds = ['#400', '#900', '#f00', '#ff8888'];
    const vs = document.getElementById('vs-text');
    vs.style.color = reds[rIdx];
    vs.style.textShadow = rIdx > 1 ? `0 0 15px ${reds[rIdx]}` : 'none';
    rIdx = (rIdx + 1) % 4;
}


// delais reveal au scroll
const observerOptions = {
    threshold: 0.15 // Déclenche l'animation quand 15% de l'élément est visible
};

const observer = new IntersectionObserver((entries) => {
    // On regroupe les éléments qui deviennent visibles en même temps
    const visibleEntries = entries.filter(entry => entry.isIntersecting);

    visibleEntries.forEach((entry, index) => {
        const el = entry.target;

        // On applique un délai progressif (stagger) uniquement 
        // pour les éléments qui apparaissent simultanément
        el.style.transitionDelay = `${index * 0.55}s`;

        el.classList.add('active');

        // Optionnel : on arrête de surveiller l'élément une fois animé
        observer.unobserve(el);
    });
}, observerOptions);

// On dit à l'observateur de surveiller tous les éléments ".reveal"
document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
});
