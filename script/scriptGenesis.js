// Crée un tableau vide pour stocker toutes les données des jeux après le chargement du JSON
let allGames = [];
const tooltip = document.getElementById('tooltip'); // sert à afficher des infos flottantes quand on survole les zones

// 1. Chargement des données
fetch('data/vgsales.json')
    .then(res => res.json()) // Transforme la réponse en objet JavaScript.
    .then(data => {
        allGames = data;
        console.log("Données chargées !");
    })
    .catch(err => console.error("Erreur de chargement :", err)); // Si le fichier n’est pas trouvé ou mal formé → affiche une erreur dans la console.

// Fonction de mise à jour des données par période + Fonction qui prend une année de début et une année de fin pour filtrer les jeux
function updateData(yearStart, yearEnd) {
    const filteredGames = allGames.filter(game => {
        const y = parseInt(game.Year);
        return y >= yearStart && y <= yearEnd;
    });

    // Définition des zones de vente
    const zones = [
        { id: 'coin-na', key: 'NA_Sales', name: 'Amérique du Nord' },
        { id: 'coin-eu', key: 'EU_Sales', name: 'Europe' },
        { id: 'coin-jp', key: 'JP_Sales', name: 'Japon' },
        { id: 'coin-global', key: 'Global_Sales', name: 'Ventes Globales' }
    ];

    // Paramètres de calcul => impact ventes animations + valeur max deplacement vertical.
    const sensitivity = 0.5;
    const maxLift = -3500;

    // Pour chaque zone, sélectionne l’élément HTML correspondant - Si l’élément n’existe pas → on passe à la suivante (return)
    zones.forEach(zone => {
        const el = document.getElementById(zone.id);
        if (!el) return;

        // Nettoyage avant chaque mise à jour
        el.classList.remove('active');
        el.onmouseenter = null;
        el.onmousemove = null;
        el.onmouseleave = null;
        el.style.cursor = "default";

        // Si des jeux existent dans la période => addityionne les ventes + moyenne ventes
        if (filteredGames.length > 0) {
            const sum = filteredGames.reduce((acc, game) => acc + (parseFloat(game[zone.key]) || 0), 0);
            const avg = (sum / filteredGames.length).toFixed(2);

            // Calcule le déplacement vertical pour l’animation.
            let lift = (avg / sensitivity) * maxLift;
            if (lift < -4500) lift = -4500;

            el.style.setProperty('--target-lift', `${lift}px`);
            el.classList.add('active');// Ajoute la classe active pour déclencher les effets visuels.

            // --- ÉVÉNEMENTS ---
            // Gestion des événements du tooltip + Change le curseur en help (point d’interrogation)
            el.onmouseenter = () => {
                el.style.cursor = "help"; // Le point d'interrogation est ici
                tooltip.style.display = "block"; // On force l'affichage
                tooltip.style.opacity = "1";
            };

            el.onmousemove = (e) => {
                // On remplit le texte
                tooltip.innerHTML = `<strong>${zone.name}</strong><br>${avg} millions d'unités`;

                // Positionnement : on ajoute e.pageX et e.pageY
                // +20 pour décaler de la pointe de la souris
                tooltip.style.left = (e.pageX + 20) + "px";
                tooltip.style.top = (e.pageY - 20) + "px";
            };

            // Quand la souris quitte la zone : Réinitialise la taille + Cache le tooltip
            el.onmouseleave = () => {
                el.style.scale = "1";
                tooltip.style.opacity = "0";
                tooltip.style.display = "none";
            };
        } else {
            el.style.setProperty('--target-lift', `0px`);
        }
    });
}

// Définit une classe pour créer des courbes SVG entre deux éléments HTML.
class CurveSVG {
    constructor(data) {
        this.from = document.querySelector(data.from);
        this.to = document.querySelector(data.to);
        if (!this.from || !this.to) return; // Si l’un n’existe pas, arrête la création.

        // Sélectionne le container SVG (.svgLines) + Crée un élément <path> SVG pour la courbe et lui applique la classe CSS curve
        this.svgContainer = document.querySelector(".svgLines");
        this.line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.line.setAttribute("class", "curve");

        // Épaisseur dynamique adaptée au volume par Genre
        // On divise par 60 pour garder une esthétique équilibrée
        const power = Math.max(2, parseFloat(data.sales) / 60);
        this.line.style.strokeWidth = power + "px";

        this.svgContainer.appendChild(this.line);
        this.setPositionLine(data.shape);
        window.addEventListener("resize", () => this.setPositionLine(data.shape));
    }

    // Fonction qui calcule et définit la position de la courbe.
    setPositionLine(shape) {
        const container = document.querySelector(".graphDyna");
        const parentRect = container.getBoundingClientRect();
        const fR = this.from.getBoundingClientRect();
        const tR = this.to.getBoundingClientRect();

        // Calcule le centre exact des éléments par rapport au container parent.
        const fX = (fR.left - parentRect.left) + fR.width / 2;
        const fY = (fR.top - parentRect.top) + fR.height / 2;
        const tX = (tR.left - parentRect.left) + tR.width / 2;
        const tY = (tR.top - parentRect.top) + tR.height / 2;

        // Calcule les contrôles de la courbe de Bézier (pour réussir bien le cercle)
        let dX = (tX - fX) / 1.5;
        let dY = (tY - fY) / 1.5;
        if (shape === 'curveY') dX = 0;

        // Définit l’attribut d du <path> SVG → tracé de la courbe Bézier.
        this.line.setAttribute("d", `M${fX} ${fY} C${fX + dX} ${fY + dY} ${tX - dX} ${tY - dY} ${tX} ${tY}`);
    }
}

// variables globales - tableau
let genres = [];
let currentIndex = 0;

// Fonction asynchrone pour charger le JSON et créer les données
async function initAll() {
    try {
        const response = await fetch('data/vgsales.json');
        const allGames = await response.json();

        // Crée un objet pour regrouper les ventes par genre.
        const genreMap = {};
        allGames.forEach(g => {
            const name = g.Genre;
            if (!name) return; // Sécurité si le "genre" est vide

            // Pour chaque jeu, additionne les ventes par zone et le total global
            if (!genreMap[name]) {
                genreMap[name] = { Name: name, NA: 0, EU: 0, JP: 0, Other: 0, Total: 0 };
            }
            genreMap[name].NA += parseFloat(g.NA_Sales) || 0;
            genreMap[name].EU += parseFloat(g.EU_Sales) || 0;
            genreMap[name].JP += parseFloat(g.JP_Sales) || 0;
            genreMap[name].Other += parseFloat(g.Other_Sales) || 0;
            genreMap[name].Total += parseFloat(g.Global_Sales) || 0;
        });

        // Transformer en tableau et trier par volume de ventes
        genres = Object.values(genreMap).sort((a, b) => b.Total - a.Total);

        // Dessine le premier genre dans le graphique.
        drawGenre(genres[0]);
    }

    // Affiche une erreur si le JSON n’a pas pu être chargé.
    catch (e) {
        console.error("Erreur de chargement du JSON", e);
    }
}


// Met à jour le graphique et les infos pour un genre donné.
// permet d'afficher le nom et total des ventes du genre + par zone
function drawGenre(genre) {
    // Mise à jour de l'affichage texte
    document.getElementById("genre-name").innerHTML = `<strong>Genre : ${genre.Name}</strong><br><medium>${genre.Total.toFixed(0)}M total</mediu>`;
    document.getElementById("market-NA").innerText = `NA: ${genre.NA.toFixed(0)}M`;
    document.getElementById("market-EU").innerText = `EU: ${genre.EU.toFixed(0)}M`;
    document.getElementById("market-JP").innerText = `JP: ${genre.JP.toFixed(0)}M`;
    document.getElementById("market-Other").innerText = `Others: ${genre.Other.toFixed(0)}M`;

    // Nettoyage et nouveau tracé
    const svg = document.querySelector(".svgLines");
    svg.innerHTML = "";

    // Définie les éléments de destination et les ventes correspondantes.
    const targets = ["#market-NA", "#market-EU", "#market-JP", "#market-Other"];
    const salesValues = [genre.NA, genre.EU, genre.JP, genre.Other];

    // Crée une courbe SVG entre le centre du jeu et chaque marché + L’épaisseur de la courbe dépend du volume de ventes
    targets.forEach((id, index) => {
        new CurveSVG({
            from: "#game-center",
            to: id,
            shape: "curveY",
            sales: salesValues[index]
        });
    });
}

// Passe au genre suivant et redessine le graphique.
function nextGenre() {
    currentIndex++;
    if (currentIndex >= genres.length) currentIndex = 0;
    drawGenre(genres[currentIndex]);
}

// Quand la page est complètement chargée, exécute initAll() pour afficher le graphique.
window.addEventListener("load", initAll)



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
