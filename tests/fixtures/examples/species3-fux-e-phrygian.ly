% species: 3
% source: Open Music Theory, "Gradus ad Parnassum Exercises", Part I Solutions, Fig. 57; after Fux, Gradus ad Parnassum (1725)
% source-url: https://raw.githubusercontent.com/MarkGotham/species/refs/heads/main/I/I-Solutions.mxl
% mode: e phrygian
% cf-position: lower
% time: 4/4
% license: Public domain (Fux 1725); Open Music Theory files CC BY-SA 4.0

cantusFirmus = {
  \clef "treble" \time 4/4
  e'1 | c'1 | d'1 | c'1 | a1 | a'1 | g'1 | e'1 | f'1 | e'1 |
}

counterpoint = {
  \clef "treble" \time 4/4
  b'4 g'4 a'4 b'4 | c''4 b'4 a'4 g'4 | f'4 g'4 a'4 b'4 | c''4 e'4 f'4 g'4 | a'4 c''4 e''4 d''4 | c''4 b'4 a'4 c''4 | b'4 d''4 b'4 a'4 | g'4 b'4 c''4 b'4 | a'4 b'4 c''4 d''4 | e''1 |
}

\score {
  <<
    \new Staff { \counterpoint }
    \new Staff { \cantusFirmus }
  >>
  \layout {}
}
