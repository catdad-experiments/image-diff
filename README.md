# image diff

You have diffed images before. You remember it happening, but don't remember how. You search online for a web version, and find quite a few. But they all upload your images to a server and take forever to return results, only for you to find out that you don't even understand the result. We've all been there, right?

Well, as it turns out, I already knew how to do this, since I could lift most of the code from [share-edit](https://github.com/catdad-experiments/share-edit)... yeah, it's a plug, go check it out.

You can [go use it right now, today](https://catdad-experiments.github.io/image-diff/). It's hosted on GitHub pages and has no server. All comparison work is done in the browser.

## Explain yourself

Okay, so I didn't actually do a good job. But it works, I promise. Here is how to read the results:

First, you get a resulting image that contains your two images as well as a third image between them that represents the difference. Red pixels are pixels that did not match (including the fuzz... more on that later), while pixels that have been washed out are ones that did match.

You also get 2 values back (well, 4, but only 2 of them actually matter to you):

**Pixel difference.** You get the percent of pixels that were different between the two images, factoring in fuzz (again, more on that later). You also get the raw pixel count, because that is what ImageMagick gives you and I am bad at math. The ImageMagick `AE` metric just gives you the amount of different pixels. But since I prefer percent and am bad at math, I am providing both values. Feel free to compare against ImageMagick results (you know... if you actually want to install ImageMagick... that's what all those server-side solutions use probably).

**Total distance difference.** This value is the percentage of overall difference in the two images, and is _not_ affected by fuzz (for the third time now, more on tha later). Regardless of what you set fuzz to, this value will always be the same.

So lets talk about distance for a minute. RGB colors (and this is not a color science class, so I won't go into any other color spaces... I won't even go far into this one) represents colors using 3 numbers -- the values of red, green, and blue -- from 0 to 255. Now, imagine three-dimensional euclidean space (yes, you may leave now), except instead of going on infinitely, it only stretches from (0, 0, 0) to (255, 255, 255). Hey, that's basically RGB. So when we talk about the distance between colors, we are takling about the distance of the 2 points plotted in this 3D space. The furthest possible distance in this space (the difference between pure white and pure black) is 441 and some change (again, bad at math, so I need to round here).

So back to total distance difference now. When comparing each pixel, I find the distance between the same pixel in both images, and add up all the differences, then divide by the total difference in the entire image (i.e. 441 * width * height).

**Let's talk about fuzz.** Okay, now is the time. If you want to compare exactly how equal two images are, just set it to 0. But when we are talking about visual comprisons, some amount of difference is not actually visible. If that sounds more like your thing, you can decide how much difference is acceptable. One way to do that is with total distance... just pick a percentage that is good for you and go with it. But a more understandable way is to think about this difference is how many pixels are different enough. This is where fuzz comes in. You can allow the pixel comparison to allow small differences. You can set this either in exact distance or in a percent distance (i.e. percentage of 441). I added both mostly because ImageMagick allows both, but also because people get confused sometimes and are bad at math. If the pixels are within that distance, the comparison will treat those as the same and not draw them in red in the result.
