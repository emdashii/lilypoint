% species: 3
% source: Wikipedia, "Counterpoint", Species counterpoint, Third species example; Fux, Gradus ad Parnassum (1725)
% source-url: https://en.wikipedia.org/wiki/Counterpoint#Third_species
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
  d'4 e'4 f'4 g'4 | a'4 b'4 c''4 d''4 | e''4 d''4 c''4 b'4 | a'4 b'4 c''4 a'4 | g'4 a'4 b'4 cis''4 | d''1 |
}

\score {
  <<
    \new Staff { \counterpoint }
    \new Staff { \cantusFirmus }
  >>
  \layout {}
}
