/**
 * Le cookie qui retient si le menu du Cockpit est replié. Défini ici, hors
 * de tout composant client : un composant serveur qui importerait la
 * constante depuis un fichier « use client » recevrait une référence, pas la
 * chaîne.
 */
export const COOKIE_MENU = 'cockpit-menu'
export const MENU_REPLIE = 'replie'
export const MENU_OUVERT = 'ouvert'
