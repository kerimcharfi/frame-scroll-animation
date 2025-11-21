const getBase64 = async (url) => {
    try {
        let contentType = "image/jpeg";
        let image = await fetch(url).then(res => {
            res.headers["content-type"];
            return res.arrayBuffer();
        });
        let raw = btoa(Array.from(new Uint8Array(image))
            .map(b => String.fromCharCode(b)).join(''));
        return `data:${contentType};base64,${raw}`;
    } catch (error) {
        console.log(error);
    }
};

async function getVideoTrack(url) {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = url;
    video.muted = true;
    await video.play();

    const [track] = video.captureStream().getVideoTracks();
    video.onended = () => track.stop();
    return track;
}

export class ScrollAnimation {
    constructor(canvasElement, scrollSection, options) {
        const { imageSrcUrl, imgSize, numFrames, numSourceFiles, files, id } = options;

        if (files.length === 1 && (files[0] === ".png" || files[0] === ".jpg")) {
            const extension = files.pop();
            for (let i = 1; i <= numSourceFiles; i++) {
                files.push(("000" + i).slice(-4) + extension);
            }
        }

        let cacheId = id;

        canvasElement.width = imgSize[0];
        canvasElement.height = imgSize[1];

        window.scrollAnimationCache = window.scrollAnimationCache || {};

        this.canvasElement = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.images = [];

        if (cacheId && window.scrollAnimationCache[cacheId]) {
            this.images = window.scrollAnimationCache[cacheId];
        }
        if (cacheId && !window.scrollAnimationCache[cacheId]) {
            window.scrollAnimationCache[cacheId] = this.images;
        }

        this.imageSrcUrl = imageSrcUrl;
        this.numSourceFiles = files.length;
        this.numFrames = numFrames ?? 0;
        this.loadedImages = 0;

        this.scrollSection = scrollSection;
        this.height = scrollSection.clientHeight;

        this.onImagesLoaded = function () {
            if (this.numFrames === 0)
                this.numFrames = this.images.length;

            this.images.sort((a, b) =>
                a.index === b.index ? a.subIndex - b.subIndex : a.index - b.index
            );

            if (options && options.reverse) {
                this.images.reverse();
            }

            let currentFrameIndex = 0;
            let animationRef = this;

            function catchUp() {
                animationRef.drawNewFrame(animationRef.images[currentFrameIndex]);
                if (++currentFrameIndex < animationRef.getFrameIndex())
                    requestAnimationFrame(catchUp);
            }

            catchUp();
        };

        let animationRef = this;

        let lowerRange = 1;
        if (options && options.range) {
            lowerRange = options.range[0];
        }

        let imageIndex = lowerRange;

        // ----------------------------------------------------------
        // VIDEO SOURCE (.mp4)
        // ----------------------------------------------------------
        if (files.length === 1 && files[0].endsWith(".mp4")) {
            fetch(imageSrcUrl + files[0])
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => {
                    const videoDecoderInit = {
                        output: (frame) => {
                            createImageBitmap(frame).then((bitmap) => {
                                const index = animationRef.images.length;
                                bitmap.index = index;
                                animationRef.images.push(bitmap);

                                if (index === 0) {
                                    animationRef.drawNewFrame(bitmap);
                                }
                                if (frame.close) frame.close();
                                if (frame.destroy) frame.destroy();
                            });
                        },
                        error: (error) => {
                            console.error('VideoDecoder error:', error);
                        },
                    };

                    let videoDecoder = new VideoDecoder(videoDecoderInit);

                    let config = options.videoConfig.decoderConfig;
                    let description = [];

                    for (let key in config.description) {
                        description[parseInt(key)] = config.description[key];
                    }
                    config.description = new Uint8Array(description);

                    videoDecoder.configure(config);

                    for (let chunk of options.videoConfig.chunks) {
                        const encodedChunk = new EncodedVideoChunk({
                            type: 'key',
                            timestamp: 0,
                            data: new Uint8Array(arrayBuffer.slice(chunk.offset, chunk.offset + chunk.size)),
                        });

                        videoDecoder.decode(encodedChunk);
                    }

                    videoDecoder.flush().then(() => videoDecoder.close());
                })
                .catch((error) => console.error('Failed to fetch or decode video:', error));

        } else {
            // ----------------------------------------------------------
            // IMAGE SEQUENCE SOURCE
            // ----------------------------------------------------------
            for (let filename of files) {
                let imagesrc = imageSrcUrl + filename;
                let img = new Image();
                let onloadCalled = false;

                img.index = imageIndex++;

                img.onload = function (event) {
                    if (onloadCalled) return;
                    onloadCalled = true;

                    if (imgSize && img.naturalWidth !== imgSize[0]) {
                        let factor = img.naturalWidth / imgSize[0];

                        if (factor % 1 === 0) {
                            let loadedSubImages = 0;

                            let canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = imgSize[1];
                            let ctx = canvas.getContext("2d");
                            ctx.drawImage(img, 0, 0);

                            for (let f = 0; f < factor; f++) {
                                createImageBitmap(canvas, f * imgSize[0], 0, imgSize[0], imgSize[1]).then(
                                    (imageBitmap) => {
                                        loadedSubImages++;
                                        imageBitmap.index = img.index;
                                        imageBitmap.subIndex = f + 1;
                                        animationRef.images.push(imageBitmap);

                                        if (loadedSubImages === factor) {
                                            animationRef.loadedImages++;
                                            if (animationRef.loadedImages >= animationRef.numSourceFiles) {
                                                animationRef.onImagesLoaded();
                                            }
                                        }
                                    }
                                );
                            }

                        } else {
                            console.error("image size does not match imgSize option");
                        }
                    } else {
                        animationRef.images.push(img);
                        animationRef.loadedImages++;

                        if (animationRef.loadedImages >= animationRef.numSourceFiles) {
                            animationRef.onImagesLoaded();
                        }
                    }

                    if (event.target.index === 1) {
                        animationRef.drawNewFrame(animationRef.images[0]);
                    }
                };

                getBase64(imagesrc).then((base64) => {
                    img.src = base64;

                    if (img.complete && !onloadCalled) {
                        img.onload({ target: img });
                    }
                });
            }
        }
    }

    drawNewFrame(image) {
        if (!image) return;
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        if (image instanceof ImageData) {
            this.ctx.putImageData(image, 0, 0);
        }

        if (image instanceof Image || image instanceof ImageBitmap) {
            this.ctx.drawImage(image, 0, 0);
        }
    }

    clearFrame() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    getFrameIndex() {
        const currentScrollPosition =
            (-this.scrollSection.getBoundingClientRect().top) /
            ((this.height - this.canvasElement.clientHeight) - window.innerHeight);

        return Math.round(currentScrollPosition * this.numFrames);
    }

    animateScroll() {
        let imageIndex = this.getFrameIndex();

        if (imageIndex >= 0 && imageIndex < this.numFrames - 1) {
            this.drawNewFrame(this.images[imageIndex]);
        }
    }
}

// ----------------------------------------------------------
// GENERIC <scroll-animation>
// ----------------------------------------------------------

let scrollanimationtags = document.getElementsByTagName("scroll-animation");

for (let scrollanimationtag of scrollanimationtags) {
    let sectionId = scrollanimationtag.getAttribute("section-id");
    let animationId = scrollanimationtag.getAttribute("animation-id");

    let scrollSection = document.getElementById(sectionId);

    let canvas = document.createElement('canvas');
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";

    scrollanimationtag.appendChild(canvas);

    // Make this value universal — user must set this in HTML
    const HOST = scrollanimationtag.getAttribute("host");

    fetch(`${HOST}/${animationId}/animation.json`)
        .then(res => res.json())
        .then(animation => {
            scrollanimationtag.style.display = "block";

            let scrollAnimation = new ScrollAnimation(canvas, scrollSection, {
                imageSrcUrl: `${HOST}/${animationId}/`,
                ...animation[0]
            });

            document.addEventListener("scroll", () => scrollAnimation.animateScroll());
        });
}
