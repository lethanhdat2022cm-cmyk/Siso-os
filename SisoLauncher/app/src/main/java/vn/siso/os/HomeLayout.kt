package vn.siso.os

import android.app.Activity
import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.SeekBar
import android.widget.Spinner
import android.widget.Switch
import android.widget.TextView
import org.json.JSONObject

/**
 * "Bố cục và kích thước biểu tượng": chỉnh chi tiết lưới màn hình chính.
 * Bảng nằm ở nửa dưới, nửa trên là màn hình chính thật nên thay đổi hiện ngay.
 */
class HomeLayout(
    private val act: Activity,
    private val readLay: ((JSONObject) -> Unit) -> Unit,
    private val writeLay: (JSONObject) -> Unit,
    private val onClose: () -> Unit
) {
    private fun dp(v: Int) = (v * act.resources.displayMetrics.density).toInt()
    private val white = Color.WHITE
    private val muted = Color.parseColor("#93A3B8")
    private val accent = Color.parseColor("#38A3FF")

    private var reopening = false

    fun show() { readLay { build(it) } }

    private fun push(k: String, v: Int, hint: TextView) {
        writeLay(JSONObject().put(k, v))
        readLay { s ->
            hint.text = if (s.optInt("ec") < s.optInt("c") || s.optInt("er") < s.optInt("r"))
                "Màn hình này chỉ đủ chỗ cho ${s.optInt("ec")} cột × ${s.optInt("er")} hàng, đã tự giảm để biểu tượng không dính nhau."
            else ""
        }
    }

    private fun label(t: String) = TextView(act).apply {
        text = t; setTextColor(muted); textSize = 13f
        setPadding(0, dp(14), 0, dp(4))
    }

    private inner class WhiteAdapter(items: List<String>) :
        ArrayAdapter<String>(act, android.R.layout.simple_spinner_dropdown_item, items) {
        override fun getView(p: Int, v: View?, g: ViewGroup): View =
            (super.getView(p, v, g) as TextView).also { it.setTextColor(white) }
        override fun getDropDownView(p: Int, v: View?, g: ViewGroup): View =
            (super.getDropDownView(p, v, g) as TextView).also {
                it.setTextColor(white); it.setBackgroundColor(Color.parseColor("#1E2836"))
            }
    }

    private fun spinner(values: List<Int>, cur: Int, onPick: (Int) -> Unit) = Spinner(act).apply {
        adapter = WhiteAdapter(values.map { it.toString() })
        setSelection(values.indexOf(cur).coerceAtLeast(0))
        background = Glass.bg(dp(10).toFloat(), Color.parseColor("#14FFFFFF"), Color.parseColor("#40FFFFFF"))
        var ready = false
        onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                if (ready) onPick(values[pos]) else ready = true
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }
    }

    private fun chips(names: List<String>, cur: Int, onPick: (Int) -> Unit): LinearLayout {
        val row = LinearLayout(act).apply { orientation = LinearLayout.HORIZONTAL }
        val tvs = ArrayList<TextView>()
        fun paint(sel: Int) = tvs.forEachIndexed { i, t ->
            t.background = Glass.bg(dp(12).toFloat(),
                if (i == sel) Color.parseColor("#3338A3FF") else Color.parseColor("#14FFFFFF"),
                if (i == sel) accent else Color.parseColor("#33FFFFFF"))
            t.setTextColor(if (i == sel) accent else white)
        }
        names.forEachIndexed { i, n ->
            val t = TextView(act).apply {
                text = n; textSize = 14f; gravity = Gravity.CENTER
                setPadding(dp(16), dp(9), dp(16), dp(9))
                setOnClickListener { paint(i); onPick(i) }
            }
            tvs.add(t)
            row.addView(t, LinearLayout.LayoutParams(-2, -2).apply { rightMargin = dp(8) })
        }
        paint(cur)
        return row
    }

    private fun build(st: JSONObject) {
        val dlg = Dialog(act, android.R.style.Theme_DeviceDefault_Dialog_NoActionBar)
        val hint = TextView(act).apply { setTextColor(muted); textSize = 12f; setPadding(0, dp(8), 0, 0) }
        val r = dp(28).toFloat()

        val col = LinearLayout(act).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), 0, dp(18), dp(24))
        }

        // Cột / Hàng
        val two = LinearLayout(act).apply { orientation = LinearLayout.HORIZONTAL }
        fun block(title: String, sp: Spinner, end: Boolean) = LinearLayout(act).apply {
            orientation = LinearLayout.VERTICAL
            addView(label(title)); addView(sp, LinearLayout.LayoutParams(-1, dp(44)))
        }.also { two.addView(it, LinearLayout.LayoutParams(0, -2, 1f).apply { if (!end) rightMargin = dp(16) }) }
        block("Cột", spinner(listOf(3, 4, 5, 6, 7, 8, 10), st.optInt("c", 6)) { push("c", it, hint) }, false)
        block("Hàng", spinner(listOf(4, 6, 8, 10, 12, 14), st.optInt("r", 8)) { push("r", it, hint) }, true)
        col.addView(two); col.addView(hint)

        // Cỡ biểu tượng
        col.addView(label("Cỡ biểu tượng"))
        col.addView(SeekBar(act).apply {
            max = 4; progress = st.optInt("s", 2)
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(b: SeekBar?, p: Int, fromUser: Boolean) { if (fromUser) push("s", p, hint) }
                override fun onStartTrackingTouch(b: SeekBar?) {}
                override fun onStopTrackingTouch(b: SeekBar?) {}
            })
        })
        col.addView(LinearLayout(act).apply {
            orientation = LinearLayout.HORIZONTAL
            listOf("Nhỏ nhất", "Mặc định", "Lớn nhất").forEachIndexed { i, t ->
                addView(TextView(act).apply {
                    text = t; setTextColor(muted); textSize = 12f
                    gravity = when (i) { 0 -> Gravity.START; 1 -> Gravity.CENTER; else -> Gravity.END }
                }, LinearLayout.LayoutParams(0, -2, 1f))
            }
        })

        // Khoảng cách và cỡ chữ
        col.addView(label("Khoảng cách giữa biểu tượng"))
        col.addView(chips(listOf("Chặt", "Vừa", "Rộng"), st.optInt("g", 1)) { push("g", it, hint) })
        col.addView(label("Cỡ chữ"))
        col.addView(chips(listOf("Nhỏ", "Trung bình", "Lớn"), st.optInt("f", 1)) { push("f", it, hint) })

        // Công tắc
        col.addView(View(act), LinearLayout.LayoutParams(-1, dp(10)))
        listOf(
            "pad" to "Hiển thị phần đệm màn hình chính",
            "nm" to "Hiển thị tên ứng dụng và thư mục",
            "sp" to "Giãn đều theo kích thước màn hình",
            "mtb" to "Khớp biểu tượng màn hình chính và thanh tác vụ",
            "msm" to "Khớp biểu tượng màn hình chính và menu Start"
        ).forEach { (k, t) ->
            col.addView(Switch(act).apply {
                text = t; setTextColor(white); textSize = 15f
                isChecked = st.optInt(k, 0) == 1
                setPadding(0, dp(10), 0, dp(10))
                setOnCheckedChangeListener { _, c -> push(k, if (c) 1 else 0, hint) }
            }, LinearLayout.LayoutParams(-1, -2))
        }

        col.addView(Button(act).apply {
            text = "Đặt lại bố cục"; isAllCaps = false
            setOnClickListener {
                writeLay(JSONObject("{\"c\":6,\"r\":8,\"s\":2,\"f\":1,\"g\":1,\"sp\":0,\"pad\":1,\"nm\":1,\"mtb\":0,\"msm\":1}"))
                reopening = true; dlg.dismiss(); reopening = false; show()
            }
        }, LinearLayout.LayoutParams(-2, -2).apply { topMargin = dp(8) })

        val root = LinearLayout(act).apply {
            orientation = LinearLayout.VERTICAL
            background = Glass.bg(0f, Color.parseColor("#F20B1424"),
                radii = floatArrayOf(r, r, r, r, 0f, 0f, 0f, 0f))
        }
        val bar = LinearLayout(act).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(8), dp(6), dp(16), dp(6))
        }
        bar.addView(TextView(act).apply {
            text = "←"; textSize = 22f; setTextColor(white); gravity = Gravity.CENTER
            setOnClickListener { dlg.dismiss() }
        }, LinearLayout.LayoutParams(dp(48), dp(48)))
        bar.addView(TextView(act).apply {
            text = "Bố cục và kích thước biểu tượng"; textSize = 17f; setTextColor(white)
        }, LinearLayout.LayoutParams(0, -2, 1f))
        root.addView(bar)
        root.addView(ScrollView(act).apply { addView(col) }, LinearLayout.LayoutParams(-1, 0, 1f))

        dlg.setContentView(root)
        dlg.setOnDismissListener { if (!reopening) onClose() }
        dlg.window?.apply {
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            setLayout(WindowManager.LayoutParams.MATCH_PARENT, (act.resources.displayMetrics.heightPixels * 0.62f).toInt())
            setGravity(Gravity.BOTTOM)
            clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        }
        dlg.show()
        push("c", st.optInt("c", 6), hint)   // hiện ngay ghi chú nếu màn hình không đủ chỗ
    }
}
