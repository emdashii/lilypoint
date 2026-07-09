% species: 1
% source: Open Music Theory, "Gradus ad Parnassum Exercises", Part I Solutions, Fig. 15 (corrected version); after Fux, Gradus ad Parnassum (1725)
% source-url: https://raw.githubusercontent.com/MarkGotham/species/refs/heads/main/I/I-Solutions.mxl
% mode: g mixolydian
% cf-position: lower
% time: 4/4
% license: Public domain (Fux 1725); Open Music Theory files CC BY-SA 4.0

cantusFirmus = {
  \clef "bass" \time 4/4
  g1 | c'1 | b1 | g1 | c'1 | e'1 | d'1 | g'1 | e'1 | c'1 | d'1 | b1 | a1 | g1 |
}

counterpoint = {
  \clef "treble" \time 4/4
  g'1 | e'1 | d'1 | g'1 | g'1 | g'1 | a'1 | b'1 | g'1 | c''1 | a'1 | g'1 | fis'1 | g'1 |
}

\score {
  <<
    \new Staff { \counterpoint }
    \new Staff { \cantusFirmus }
  >>
  \layout {}
}
