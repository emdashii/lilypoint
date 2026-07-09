% species: 1
% source: Wikipedia, "Counterpoint", Species counterpoint, First species example; Fux, Gradus ad Parnassum (1725)
% source-url: https://en.wikipedia.org/wiki/Counterpoint#First_species
% mode: d dorian
% cf-position: lower
% time: 4/4
% license: Public domain (Fux 1725); Wikipedia page/media available under CC BY-SA 4.0

cantusFirmus = {
  \clef "treble" \time 4/4
  d'1 | f'1 | g'1 | f'1 | e'1 | d'1 |
}

counterpoint = {
  \clef "treble" \time 4/4
  d''1 | a'1 | b'1 | d''1 | cis''1 | d''1 |
}

\score {
  <<
    \new Staff { \counterpoint }
    \new Staff { \cantusFirmus }
  >>
  \layout {}
}
