% species: 5
% source: Wikipedia, "Counterpoint", Species counterpoint, Fifth species (florid counterpoint) example; Fux, Gradus ad Parnassum (1725)
% source-url: https://en.wikipedia.org/wiki/Counterpoint#Fifth_species_(florid_counterpoint)
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
  r2 a'2 | d''2 c''2 | b'4 c''4 d''4 e''4 | f''4 e''4 d''2~ | d''4 cis''8 b'8 cis''2 | d''1 |
}

\score {
  <<
    \new Staff { \counterpoint }
    \new Staff { \cantusFirmus }
  >>
  \layout {}
}
