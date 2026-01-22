
// Déclaration des variables globales
let audioCtx;
let oscillator;
let gainNode;
let dataDecennies = [];
let currentIndex = 0;
let isPlaying = false;
let timeoutSequence;

// Fonction de chargement et calcul des données
// elle attend le chargement du JSON avant de continuer.
async function chargerEtCalculerDonnees(url) {
    try {
        const response = await fetch(url);// Télécharge le fichier JSON
        const data = await response.json();

        // Définit les tranches de décennies que l’on va analyser
        const tranches = [
            { label: "1980-1990", start: 1980, end: 1989 },
            { label: "1990-2000", start: 1990, end: 1999 },
            { label: "2000-2010", start: 2000, end: 2009 },
            { label: "2010-2022", start: 2010, end: 2022 }
        ];

        // Filtre les jeux dont l’année définie + Compte le nombre de jeux(length) + Renvoie un objet
        return tranches.map(t => {
            const count = data.filter(g => parseInt(g.Year || g.year) >= t.start && parseInt(g.Year || g.year) <= t.end).length;
            return { label: t.label, nouveaux: count };
        });
        // Si erreur retourne un objet d’erreur.
    } catch (e) { return [{ label: "Erreur", nouveaux: 0 }]; }
}


// Crée le contexte audio.
// webkitAudioContext pour compatibilité avec certains navigateurs anciens.

function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    // Crée un oscillateur pour générer un son pur.
    gainNode = audioCtx.createGain();
    // Le son généré sera une onde triangulaire.
    oscillator.type = 'triangle';
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    // Crée un filtre : coupe les fréquences au-dessus de 900 Hz - adoucissant le son
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    // Chaîne audio : oscillateur → filtre → volume → haut-parleur.
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    // Démarre le générateur de son
    oscillator.start();
}

// Si la séquence n’est pas active, le script ne se réalise pas
function executerSequence() {
    if (!isPlaying) return;

    // Récupère la décennie actuelle et le nombre de jeux
    const current = dataDecennies[currentIndex];
    const totalJeux = current.nouveaux;

    // Sélectionne les éléments HTML pour mettre à jour le visuel
    const container = document.querySelector('.sonar-box');
    const counter = document.getElementById('data-counter');
    const wave = document.getElementById('visualizer');

    // décennie et le nombre de jeux à l’écran
    document.getElementById('decade-display').textContent = current.label;
    counter.textContent = totalJeux;
    counter.classList.add('show');

    // Son
    const volumeCible = Math.min(0.1 + (totalJeux / 12000), 0.3);// plus il y a de jeux, plus le son est fort
    const freqCible = 130 + (totalJeux / 25);// plus il y a de jeux, plus le son est aigu.

    // Applique progressivement volume et fréquence pour un effet smooth (0.8s)
    gainNode.gain.setTargetAtTime(volumeCible, audioCtx.currentTime, 0.8);
    oscillator.frequency.setTargetAtTime(freqCible, audioCtx.currentTime, 0.8);

    // Visuel
    const scale = 1 + Math.min(totalJeux / 1000, 3.5); // On limite un peu le scale pour pas tout cacher
    // Agrandit le wave proportionnellement au nombre de jeux
    wave.style.transform = `scale(${scale})`;

    // Si beaucoup de jeux (>2000) change la couleur.
    if (totalJeux > 2000) {
        container.classList.add('shake-active');
        wave.style.borderColor = "#ffffff";
    } else {
        container.classList.remove('shake-active');
        wave.style.borderColor = "var(--neon-pink)";
    }

    // Passe à la décennie suivante + retourne au début si on arrive à la fin
    currentIndex = (currentIndex + 1) % dataDecennies.length;
    timeoutSequence = setTimeout(executerSequence, 4000);
    // Relance la fonction après 4 secondes pour créer la boucle.
}

// Détecte un clic sur le bouton.
document.getElementById('play-btn').addEventListener('click', function () {
    // Si la séquence n’est pas active : Initialise l’audio si nécessaire --> Démarre le contexte audio --> Change le texte du bouton --> Lance la séquence
    if (!isPlaying) {
        if (!audioCtx) initAudio();
        audioCtx.resume();
        isPlaying = true;
        this.textContent = "STOPPER L'ANALYSE";
        executerSequence();
    }

    // Sinon, stoppe la séquence : Arrête la boucle avec clearTimeout --> Diminue progressivement le volume
    // Réinitialise les animations visuelles --> Change le texte du bouton
    else {
        isPlaying = false;
        clearTimeout(timeoutSequence);
        this.textContent = "RELANCER L'ANALYSE";
        gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        document.querySelector('.sonar-box').classList.remove('shake-active');
        document.getElementById('visualizer').style.transform = "scale(1)";
    }
});

// Charge les données depuis le JSON.
chargerEtCalculerDonnees('data/vgsales.json').then(res => { dataDecennies = res; });

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