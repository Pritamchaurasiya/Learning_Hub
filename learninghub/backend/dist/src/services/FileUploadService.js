"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCourseThumbnail = exports.uploadTestAttachment = exports.uploadDocument = exports.uploadAvatar = exports.FileType = void 0;
exports.createUpload = createUpload;
exports.processUploadedFile = processUploadedFile;
exports.deleteFile = deleteFile;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
var FileType;
(function (FileType) {
    FileType["AVATAR"] = "avatar";
    FileType["DOCUMENT"] = "document";
    FileType["TEST_ATTACHMENT"] = "test_attachment";
    FileType["COURSE_THUMBNAIL"] = "course_thumbnail";
})(FileType || (exports.FileType = FileType = {}));
const FILE_CONFIGS = {
    [FileType.AVATAR]: {
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxSize: 2 * 1024 * 1024, // 2MB
        destination: 'uploads/avatars',
    },
    [FileType.DOCUMENT]: {
        allowedTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ],
        maxSize: 10 * 1024 * 1024, // 10MB
        destination: 'uploads/documents',
    },
    [FileType.TEST_ATTACHMENT]: {
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        maxSize: 5 * 1024 * 1024, // 5MB
        destination: 'uploads/tests',
    },
    [FileType.COURSE_THUMBNAIL]: {
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSize: 3 * 1024 * 1024, // 3MB
        destination: 'uploads/courses',
    },
};
function ensureDirectoryExists(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
function generateFileName(originalName) {
    const ext = path_1.default.extname(originalName);
    const uniqueId = crypto_1.default.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}-${uniqueId}${ext}`;
}
function createStorage(fileType) {
    const config = FILE_CONFIGS[fileType];
    ensureDirectoryExists(config.destination);
    return multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, config.destination);
        },
        filename: (_req, file, cb) => {
            cb(null, generateFileName(file.originalname));
        },
    });
}
function createFileFilter(fileType) {
    const config = FILE_CONFIGS[fileType];
    return (_req, file, cb) => {
        if (config.allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`));
        }
    };
}
function createUpload(fileType) {
    const config = FILE_CONFIGS[fileType];
    const storage = createStorage(fileType);
    const fileFilter = createFileFilter(fileType);
    return (0, multer_1.default)({
        storage,
        fileFilter,
        limits: {
            fileSize: config.maxSize,
        },
    });
}
function processUploadedFile(file, fileType) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const relativePath = path_1.default.relative(process.cwd(), file.path);
    return {
        filename: file.filename,
        originalname: file.originalname,
        path: relativePath,
        size: file.size,
        mimetype: file.mimetype,
        url: `${baseUrl}/${relativePath.replace(/\\/g, '/')}`,
    };
}
async function deleteFile(filePath) {
    try {
        const absolutePath = path_1.default.isAbsolute(filePath) ? filePath : path_1.default.join(process.cwd(), filePath);
        if (fs_1.default.existsSync(absolutePath)) {
            fs_1.default.unlinkSync(absolutePath);
            logger_1.default.info(`[FileUpload] Deleted file: ${absolutePath}`);
            return true;
        }
        return false;
    }
    catch (error) {
        logger_1.default.error('[FileUpload] Failed to delete file', error instanceof Error ? error : new Error(String(error)), { filePath });
        return false;
    }
}
exports.uploadAvatar = createUpload(FileType.AVATAR).single('avatar');
exports.uploadDocument = createUpload(FileType.DOCUMENT).single('document');
exports.uploadTestAttachment = createUpload(FileType.TEST_ATTACHMENT).single('attachment');
exports.uploadCourseThumbnail = createUpload(FileType.COURSE_THUMBNAIL).single('thumbnail');
exports.default = {
    createUpload,
    processUploadedFile,
    deleteFile,
    FileType,
};
