# Critique ignore list

One finding per line. Anything matching a line here is dropped silently from
future `impeccable critique` runs. For deliberate deviations and accepted
detector false positives, not for things merely not fixed yet.

# Ornamental form-field ordinals on /contact ("01 Ad Soyad", "02 E-poçt", ...).
# axe reports text-ink-faint on white at 1.72:1. Kept on purpose: the numerals
# are aria-hidden ornament, the label they prefix is text-ink-mute and clears
# 4.5:1, and the fields are in visual order regardless, so nothing is conveyed
# by the numeral alone. --color-ink-faint is documented in globals.css as
# decorative-only and is being used exactly as documented. Raising it would put
# the ordinals in competition with the labels they annotate.
text-ink-faint
01 Ad Soyad
