"""
core/urls.py
============
Single router wires every ViewSet.
Mounted at /api/v1/ by the main urls.py
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    PatientViewSet,
    SpecialistViewSet,
    ServiceTariffViewSet,
    VisitViewSet,
    TriageViewSet,
    ConsultationViewSet,
    LabOrderViewSet,
    LabResultViewSet,
    RadiologyOrderViewSet,
    RadiologyResultViewSet,
    PrescriptionViewSet,
    DrugInventoryViewSet,
    InvoiceViewSet,
    PaymentViewSet,
    DashboardView,
)

router = DefaultRouter()
router.register(r"users",              UserViewSet,             basename="user")
router.register(r"patients",           PatientViewSet,          basename="patient")
router.register(r"specialists",        SpecialistViewSet,       basename="specialist")
router.register(r"tariffs",            ServiceTariffViewSet,    basename="tariff")
router.register(r"visits",             VisitViewSet,            basename="visit")
router.register(r"triage",             TriageViewSet,           basename="triage")
router.register(r"consultations",      ConsultationViewSet,     basename="consultation")
router.register(r"lab-orders",         LabOrderViewSet,         basename="lab-order")
router.register(r"lab-results",        LabResultViewSet,        basename="lab-result")
router.register(r"radiology-orders",   RadiologyOrderViewSet,   basename="radiology-order")
router.register(r"radiology-results",  RadiologyResultViewSet,  basename="radiology-result")
router.register(r"prescriptions",      PrescriptionViewSet,     basename="prescription")
router.register(r"drugs",              DrugInventoryViewSet,    basename="drug")
router.register(r"invoices",           InvoiceViewSet,          basename="invoice")
router.register(r"payments",           PaymentViewSet,          basename="payment")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/stats/", DashboardView.as_view(), name="dashboard-stats"),
]