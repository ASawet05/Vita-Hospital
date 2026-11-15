// Vita Hospital — İzometrik harita motoru (Aşama 2'de doldurulacak)
(function () {
  const VH = (window.VH = window.VH || {});

  // Tasarım belgesinde adı geçen ve haritada kullanılacak görseller.
  // main.js açılışta bunların gerçekten yüklendiğini doğrular.
  const REQUIRED = [
    // Resepsiyon
    'core/Architecture/hospital_architecture_floor_linoleum_white_01',
    'core/Furniture/hospital_furniture_desk_reception_01',
    'core/Decor/hospital_decor_queue_display_blank_01',
    'core/Decor/hospital_decor_sign_directory_stand_blank_01',
    // Bekleme salonu
    'ward/waiting_chairs',
    'core/Furniture/hospital_furniture_chairs_waiting_row_01',
    'core/Decor/hospital_decor_vending_machine_blank_01',
    'core/Decor/hospital_decor_water_dispenser_column_01',
    'core/Decor/hospital_decor_play_mat_children_01',
    // Muayene odaları
    'core/Furniture/hospital_furniture_desk_doctor_01',
    'core/Furniture/hospital_furniture_bed_examination_01',
    'core/Furniture/hospital_furniture_curtain_privacy_screen_01',
    'core/Furniture/hospital_furniture_stool_medical_round_01',
    'core/Equipment/hospital_equipment_blood_pressure_stand_01',
    'core/Supplies/hospital_supplies_stethoscope_01',
    'core/Props/hospital_props_reflex_hammer_01',
    'core/Props/hospital_props_penlight_exam_01',
    // Kan alma & laboratuvar
    'core/Architecture/hospital_architecture_floor_linoleum_green_01',
    'lab/blood_draw_chair',
    'lab/hematology_analyzer',
    'lab/specimen_vial_rack',
    'core/Props/hospital_props_blood_tubes_rack_01',
    'core/Equipment/hospital_equipment_centrifuge_bench_01',
    'core/Equipment/hospital_equipment_microscope_station_01',
    'core/Equipment/hospital_equipment_autoclave_sterilizer_01',
    'core/Supplies/hospital_supplies_syringe_tray_01',
    'lab/biohazard_waste_bin',
    // Acil servis
    'core/Architecture/hospital_architecture_curb_ambulance_bay_01',
    'core/Furniture/hospital_furniture_gurney_stretcher_01',
    'core/Equipment/hospital_equipment_defibrillator_01',
    'core/Equipment/hospital_equipment_monitor_patient_01',
    'core/Equipment/hospital_equipment_ventilator_01',
    'core/Equipment/hospital_equipment_oxygen_tanks_pair_01',
    'ward/iv_drip_stand',
    'core/Furniture/hospital_furniture_iv_stand_01',
    'ward/wheelchair',
    // Eczane
    'core/Furniture/hospital_furniture_cabinet_medicine_01',
    'core/Supplies/hospital_supplies_medicine_bottles_group_01',
    'core/Supplies/hospital_supplies_pill_blister_packs_01',
    'core/Supplies/hospital_supplies_first_aid_kit_01',
    'core/Supplies/hospital_supplies_mask_box_01',
    'core/Supplies/hospital_supplies_glove_box_01',
    'core/Supplies/hospital_supplies_sanitizer_dispenser_stand_01',
    // Başhekim odası
    'core/Decor/hospital_decor_locker_staff_narrow_01',
    // Duvar/kapı
    'ward/wall_double_doors_left',
    'ward/wall_double_doors_right',
    'lab/wall_plain_left',
    'lab/wall_plain_right',
    // İleri servisler (Aşama 5)
    'lab/operating_table',
    'lab/anesthesia_machine',
    'lab/scrub_trough_station',
    'core/Equipment/hospital_equipment_lamp_surgical_01',
    'lab/floor_or_terrazzo',
    'ward/hospital_bed',
    'ward/bedside_cabinet',
    'ward/teddy_bear',
    'ward/floor_ward_vinyl',
    'core/Furniture/hospital_furniture_incubator_infant_01',
    'core/Equipment/hospital_equipment_xray_machine_01',
    'core/Equipment/hospital_equipment_ultrasound_cart_01',
    'core/Equipment/hospital_equipment_ecg_machine_01',
    'core/Equipment/hospital_equipment_dialysis_machine_01',
  ];

  VH.map = {
    REQUIRED,
    TILE_W: 64,
    TILE_H: 32,
    init() { /* Aşama 2 */ },
    draw(/* ctx, camera */) { /* Aşama 2 */ },
  };
})();
