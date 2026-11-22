package vn.siso.os

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Environment
import android.provider.ContactsContract
import android.provider.MediaStore
import java.io.File
import java.text.Normalizer
import java.util.Locale

data class ContactHit(val id: Long, val lookup: String, val name: String, val number: String)
data class FileHit(val name: String, val path: String, val size: Long)

/** Tìm danh bạ + tệp, không phân biệt hoa thường và dấu tiếng Việt. */
object Search {

    private val marks = Regex("\\p{Mn}+")

    fun norm(s: String): String =
        Normalizer.normalize(s.lowercase(Locale.ROOT), Normalizer.Form.NFD)
            .replace(marks, "").replace('đ', 'd')

    // ---------- danh bạ ----------
    fun hasContacts(c: Context) =
        c.checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED

    private var cache: List<ContactHit> = emptyList()
    private var cacheAt = 0L

    private fun allContacts(c: Context): List<ContactHit> {
        if (System.currentTimeMillis() - cacheAt < 60_000 && cache.isNotEmpty()) return cache
        val out = ArrayList<ContactHit>()
        val seen = HashSet<Long>()
        try {
            c.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                    ContactsContract.CommonDataKinds.Phone.LOOKUP_KEY,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                ), null, null, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " COLLATE NOCASE"
            )?.use { cur ->
                while (cur.moveToNext()) {
                    val id = cur.getLong(0)
                    if (!seen.add(id)) continue
                    out.add(ContactHit(id, cur.getString(1) ?: "", cur.getString(2) ?: "", cur.getString(3) ?: ""))
                }
            }
        } catch (_: Exception) {}
        cache = out; cacheAt = System.currentTimeMillis()
        return out
    }

    fun contacts(c: Context, q: String, limit: Int = 6): List<ContactHit> {
        if (!hasContacts(c)) return emptyList()
        val nq = norm(q.trim())
        val digits = q.filter { it.isDigit() }
        return allContacts(c).filter {
            norm(it.name).contains(nq) || (digits.length >= 3 && it.number.filter { ch -> ch.isDigit() }.contains(digits))
        }.take(limit)
    }

    // ---------- tệp ----------
    fun hasStorage(c: Context) =
        if (android.os.Build.VERSION.SDK_INT >= 30) Environment.isExternalStorageManager()
        else c.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED

    private fun okPath(p: String): Boolean {
        if (p.contains("/Android/")) return false
        return p.split('/').none { it.startsWith(".") && it.length > 1 }
    }

    fun files(c: Context, q: String, limit: Int = 10): List<FileHit> {
        if (!hasStorage(c)) return emptyList()
        val nq = norm(q.trim())
        val out = LinkedHashMap<String, FileHit>()
        try {
            c.contentResolver.query(
                MediaStore.Files.getContentUri("external"),
                arrayOf(MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.MediaColumns.DATA, MediaStore.MediaColumns.SIZE),
                "${MediaStore.MediaColumns.DISPLAY_NAME} LIKE ?", arrayOf("%${q.trim()}%"),
                "${MediaStore.MediaColumns.DATE_MODIFIED} DESC"
            )?.use { cur ->
                while (cur.moveToNext() && out.size < limit) {
                    val path = cur.getString(1) ?: continue
                    if (!okPath(path)) continue
                    val f = File(path)
                    if (!f.isFile) continue
                    out[path] = FileHit(cur.getString(0) ?: f.name, path, cur.getLong(2))
                }
            }
        } catch (_: Exception) {}
        // dự phòng: duyệt vài thư mục thường dùng (tệp chưa được hệ thống lập chỉ mục, tìm có dấu tiếng Việt)
        if (out.size < 4) {
            val root = Environment.getExternalStorageDirectory()
            var visited = 0
            fun walk(d: File, depth: Int) {
                if (depth > 4 || out.size >= limit || visited > 6000) return
                val kids = d.listFiles() ?: return
                for (k in kids) {
                    if (k.name.startsWith(".")) continue
                    visited++
                    if (k.isDirectory) walk(k, depth + 1)
                    else if (norm(k.name).contains(nq) && !out.containsKey(k.path)) {
                        out[k.path] = FileHit(k.name, k.path, k.length())
                        if (out.size >= limit) return
                    }
                }
            }
            for (n in listOf("Download", "Documents", "DCIM", "Pictures", "Movies", "Music")) walk(File(root, n), 0)
        }
        return out.values.toList()
    }
}
